"""Release/asset operations using the user's existing Git credential helper.
Credentials stay in memory and are never printed or written to a file.
"""
import argparse, hashlib, http.client, json, os, pathlib, subprocess, urllib.parse, urllib.request

REPO = "felixdroidhuerta/LQTAC_Studio"

def credential():
    result = subprocess.run(["git", "-c", "credential.interactive=never", "credential", "fill"],
                            input="protocol=https\nhost=github.com\npath=" + REPO + ".git\n\n",
                            text=True, capture_output=True, check=True,
                            env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    values = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    return values["password"]

def api(token, route, data=None):
    request = urllib.request.Request("https://api.github.com/repos/" + REPO + route,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                 "User-Agent": "LQTAC-Studio-release", "X-GitHub-Api-Version": "2022-11-28"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)

def upload(token, release, file):
    digest = hashlib.file_digest(file.open("rb"), "sha256").hexdigest()
    existing = next((asset for asset in release["assets"] if asset["name"] == file.name), None)
    if existing:
        if existing.get("digest") == "sha256:" + digest and existing["size"] == file.stat().st_size:
            print(json.dumps({"already_uploaded": True, "name": file.name, "sha256": digest}))
            return
        raise RuntimeError("Asset already exists with different content; historical files are never replaced")
    route = "/repos/" + REPO + "/releases/" + str(release["id"]) + "/assets?name=" + urllib.parse.quote(file.name)
    connection = http.client.HTTPSConnection("uploads.github.com", timeout=300)
    connection.putrequest("POST", route)
    for key, value in {"Authorization": "Bearer " + token, "User-Agent": "LQTAC-Studio-release",
                       "Accept": "application/vnd.github+json", "Content-Type": "application/octet-stream",
                       "Content-Length": str(file.stat().st_size)}.items():
        connection.putheader(key, value)
    connection.endheaders()
    with file.open("rb") as stream:
        while block := stream.read(1024 * 1024):
            connection.send(block)
    response = connection.getresponse()
    result = json.loads(response.read())
    if response.status != 201:
        raise RuntimeError("GitHub asset upload failed: " + str(response.status) + " " + str(result.get("message", "")))
    if result["size"] != file.stat().st_size or result.get("digest") != "sha256:" + digest:
        raise RuntimeError("Uploaded asset digest/size could not be confirmed")
    print(json.dumps({"name": result["name"], "size": result["size"], "sha256": digest,
                      "url": result["browser_download_url"]}))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["list", "create", "upload", "publish"])
    parser.add_argument("--tag")
    parser.add_argument("--commit")
    parser.add_argument("--notes", type=pathlib.Path)
    parser.add_argument("--file", type=pathlib.Path)
    args = parser.parse_args()
    token = credential()
    if args.action == "list":
        releases = api(token, "/releases?per_page=100")
        print(json.dumps([{"tag": r["tag_name"], "draft": r["draft"], "url": r["html_url"],
            "assets": [{k: a.get(k) for k in ["name", "size", "digest", "browser_download_url"]} for a in r["assets"]]}
            for r in releases], ensure_ascii=False))
    elif args.action == "create":
        result = api(token, "/releases", {"tag_name": args.tag, "target_commitish": args.commit,
            "name": "LQTAC Studio " + args.tag.removeprefix("v").removesuffix("-portable") + " · Windows x64 portable",
            "body": args.notes.read_text(encoding="utf-8"), "draft": True, "prerelease": False})
        print(json.dumps({"id": result["id"], "tag": result["tag_name"], "draft": result["draft"]}))
    else:
        releases = api(token, "/releases?per_page=100")
        release = next(r for r in releases if r["tag_name"] == args.tag)
        if args.action == "upload":
            upload(token, release, args.file)
        else:
            request = urllib.request.Request("https://api.github.com/repos/" + REPO + "/releases/" + str(release["id"]),
                method="PATCH", data=json.dumps({"draft": False, "make_latest": "true"}).encode(),
                headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                         "User-Agent": "LQTAC-Studio-release"})
            with urllib.request.urlopen(request, timeout=90) as response:
                published = json.load(response)
            print(json.dumps({"url": published["html_url"], "draft": published["draft"]}))

if __name__ == "__main__":
    main()
