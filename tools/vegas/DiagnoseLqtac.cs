using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using ScriptPortal.Vegas;

// Read-only inspection. No project setters, saves, rendering or media writes.
public class EntryPoint
{
    readonly List<string> errors = new List<string>();
    readonly List<object> groups = new List<object>();
    object Read(object o, string key)
    {
        if (o == null) return null;
        PropertyInfo p = o.GetType().GetProperty(key);
        if (p == null || !p.CanRead) return null;
        try { return p.GetValue(o, null); }
        catch (Exception e) { errors.Add(o.GetType().Name + "." + key + ": " + e.GetBaseException().Message); return null; }
    }
    object Scalar(object v)
    {
        if (v == null) return null;
        if (v is Timecode) return ((Timecode)v).ToMilliseconds() / 1000.0;
        Type t = v.GetType();
        if (t.IsEnum) return v.ToString();
        if (t.IsPrimitive || v is string || v is decimal) return v;
        return v.ToString();
    }
    Dictionary<string, object> Props(object o, string names)
    {
        Dictionary<string, object> d = new Dictionary<string, object>();
        if (o == null) return d;
        d["apiType"] = o.GetType().FullName;
        foreach (string n in names.Split(' '))
            if (o.GetType().GetProperty(n) != null && o.GetType().GetProperty(n).CanRead) d[n] = Scalar(Read(o, n));
        return d;
    }
    IEnumerable Items(object o)
    {
        List<object> values = new List<object>();
        if (o == null) return values;
        try { foreach (object value in (IEnumerable)o) values.Add(value); }
        catch (Exception e) { errors.Add(o.GetType().Name + " enumeration: " + e.GetBaseException().Message); }
        return values;
    }
    List<object> Effects(object owner)
    {
        List<object> result = new List<object>();
        foreach (object effect in Items(Read(owner, "Effects"))) {
            Dictionary<string, object> d = Props(effect, "Index Bypass Preset IsOFX");
            d["plugin"] = Props(Read(effect, "PlugIn"), "Name UniqueID ClassID");
            result.Add(d);
        }
        return result;
    }
    List<object> Envelopes(object owner)
    {
        List<object> result = new List<object>();
        foreach (object env in Items(Read(owner, "Envelopes"))) {
            Dictionary<string, object> d = Props(env, "Index Type Name Min Max Neutral");
            List<object> points = new List<object>();
            foreach (object point in Items(Read(env, "Points"))) points.Add(Props(point, "Index X Y Curve"));
            d["points"] = points; result.Add(d);
        }
        return result;
    }
    Dictionary<string, object> FadeInfo(object fade)
    {
        Dictionary<string, object> d = Props(fade, "Length Curve ReciprocalCurve Gain");
        object transition = Read(fade, "Transition");
        d["transition"] = transition == null ? null : Props(Read(transition, "PlugIn"), "Name UniqueID ClassID");
        // The API exposes this collection on audio fades but COM enumeration fails.
        d["envelopes"] = transition == null ? new List<object>() : Envelopes(fade); return d;
    }
    Dictionary<string, object> Motion(object motion)
    {
        Dictionary<string, object> d = Props(motion, "HasMotionData HasShadowData ShadowEnabled HasGlowData GlowEnabled MaintainAspectRatio");
        List<object> frames = new List<object>();
        foreach (object k in Items(Read(motion, motion is TrackMotion ? "MotionKeyframes" : "Keyframes"))) {
            Dictionary<string, object> f = Props(k, "Position Type Rotation Smoothness Width Height CenterX CenterY PositionX PositionY PositionZ ScaleX ScaleY ScaleZ");
            object bounds = Read(k, "Bounds");
            if (bounds != null) {
                Dictionary<string, object> b = Props(bounds, "Width Height");
                foreach (string corner in new string[] {"TopLeft", "TopRight", "BottomLeft", "BottomRight"}) b[corner] = Props(Read(bounds, corner), "X Y");
                f["bounds"] = b;
            }
            f["center"] = Props(Read(k, "Center"), "X Y"); frames.Add(f);
        }
        d["keyframes"] = frames; return d;
    }
    Dictionary<string, object> MediaInfo(object media)
    {
        Dictionary<string, object> d = Props(media, "FilePath Length UseProxy MediaType");
        if (media is Media) {
            Media m = (Media)media;
            d["IsOffline"] = m.IsOffline(); d["IsGenerated"] = m.IsGenerated(); d["IsSubclip"] = m.IsSubclip();
            d["fileExists"] = File.Exists(m.FilePath);
        }
        d["effects"] = Effects(media);
        List<object> streams = new List<object>();
        foreach (object s in Items(Read(media, "Streams"))) streams.Add(Props(s, "Index MediaType Length FrameRate Width Height PixelAspectRatio SampleRate Channels Format"));
        d["streams"] = streams; return d;
    }
    public void FromVegas(Vegas vegas)
    {
        string directory = Path.Combine(Path.GetDirectoryName(ScriptPortal.Vegas.Script.File), "diagnostics");
        Directory.CreateDirectory(directory);
        string output = Path.Combine(directory, "vegas-diagnostic-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N").Substring(0,8) + ".json");
        bool modifiedBefore = vegas.Project.IsModified;
        Dictionary<string, object> report = new Dictionary<string, object>();
        report["format"] = "LQTAC VEGAS diagnostic"; report["version"] = 1;
        report["createdUtc"] = DateTime.UtcNow.ToString("o"); report["vegasVersion"] = vegas.Version;
        report["apiAssembly"] = typeof(Vegas).Assembly.FullName;
        report["project"] = Props(vegas.Project, "FilePath Length IsModified IsUntitled");
        report["video"] = Props(vegas.Project.Video, "Width Height FrameRate PixelAspectRatio FieldOrder PixelFormat FullResolutionRenderQuality");
        report["audio"] = Props(vegas.Project.Audio, "SampleRate BitDepth MasterBusMode NumberOfStereoBuses");
        List<object> tracks = new List<object>(); int trackIndex = 0;
        foreach (Track track in vegas.Project.Tracks) {
            Dictionary<string, object> t = Props(track, "Index Name MediaType Mute Solo Volume PanX PanY PanCenter InvertPhase CompositeLevel CompositeMode CompositeNestingLevel IsAdjustmentTrack");
            t["id"] = "track-" + trackIndex++;
            t["effects"] = Effects(track); t["envelopes"] = Envelopes(track);
            t["motion"] = Motion(Read(track, "TrackMotion"));
            if (track is VideoTrack && ((VideoTrack)track).CompositeNestingLevel > 0) t["parentMotion"] = Motion(Read(track, "ParentTrackMotion"));
            List<object> events = new List<object>(); int eventIndex = 0;
            foreach (TrackEvent ev in track.Events) {
                Dictionary<string, object> e = Props(ev, "Index Name MediaType Start Length End PlaybackRate Mute Loop IsGrouped SyncOffset Gain Normalize NormalizeGain ChannelMode ResampleMode MaintainAspectRatio ReduceInterlace FlickerRemoval IsAdjustmentEvent");
                e["id"] = t["id"] + "-event-" + eventIndex++;
                object group = Read(ev, "Group");
                if (group != null) { int gi = groups.IndexOf(group); if (gi < 0) {gi = groups.Count; groups.Add(group);} e["groupId"] = "group-" + gi; }
                e["fadeIn"] = FadeInfo(ev.FadeIn); e["fadeOut"] = FadeInfo(ev.FadeOut);
                e["effects"] = Effects(ev); e["envelopes"] = Envelopes(ev);
                e["motion"] = Motion(Read(ev, "VideoMotion"));
                List<object> takes = new List<object>();
                foreach (Take take in ev.Takes) {
                    Dictionary<string, object> a = Props(take, "Index Name IsActive MediaPath StreamIndex Offset Length AvailableLength");
                    if (ev is AudioEvent) { a["FirstAudioChannelIndex"] = take.FirstAudioChannelIndex; a["AudioChannelCount"] = take.AudioChannelCount; }
                    a["media"] = MediaInfo(take.Media);
                    a["stream"] = Props(take.MediaStream, "Index MediaType Length FrameRate Width Height PixelAspectRatio SampleRate Channels Format");
                    takes.Add(a);
                }
                e["takes"] = takes; events.Add(e);
            }
            t["events"] = events; tracks.Add(t);
        }
        report["tracks"] = tracks;
        List<object> buses = new List<object>();
        foreach (object bus in Items(Read(vegas.Project, "BusTracks"))) { Dictionary<string, object> b = Props(bus, "Name Volume Mute Solo"); b["effects"] = Effects(bus); b["envelopes"] = Envelopes(bus); buses.Add(b); }
        report["buses"] = buses;
        report["videoBusEffects"] = Effects(Read(vegas.Project, "VideoBus"));
        report["masterBusEffects"] = Effects(Read(vegas.Project, "MasterBus"));
        List<object> mediaPool = new List<object>();
        foreach (object media in vegas.Project.MediaPool) mediaPool.Add(MediaInfo(media));
        report["mediaPool"] = mediaPool;
        report["readErrors"] = errors;
        report["modifiedBefore"] = modifiedBefore; report["modifiedAfter"] = vegas.Project.IsModified;
        JavaScriptSerializer serializer = new JavaScriptSerializer(); serializer.MaxJsonLength = 100 * 1024 * 1024;
        string temporary = output + ".tmp";
        File.WriteAllText(temporary, serializer.Serialize(report), new UTF8Encoding(false)); File.Move(temporary, output);
        MessageBox.Show("Diagnostico de solo lectura terminado.\nPistas: " + tracks.Count + "\nErrores de lectura: " + errors.Count + "\n\n" + output, "LQTAC - Diagnostico VEGAS");
    }
}
