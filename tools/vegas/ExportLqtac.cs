using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Security.Cryptography;
using ScriptPortal.Vegas;

// Reads the user's saved project. Curve calibration edits only a temporary clone.
public class EntryPoint
{
    public bool Automated = false;
    public string OutputPath = null;
    string HashFile(string file)
    {
        using (SHA256 sha = SHA256.Create()) using (FileStream stream = File.OpenRead(file)) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
    }
    Dictionary<string, object> NativeCurves(Vegas vegas)
    {
        Dictionary<string, object> result = new Dictionary<string, object>();
        Project scratch = vegas.Project.CloneProject(null);
        using (scratch.CreateBackgroundProjectActiveState()) {
        using (new UndoBlock(scratch, "LQTAC native curve calibration")) {
        AudioTrack scratchTrack = null;foreach(Track track in scratch.Tracks)if(track is AudioTrack){scratchTrack=(AudioTrack)track;break;}
        if(scratchTrack==null){scratchTrack=new AudioTrack(scratch,-1,"LQTAC calibration");scratch.Tracks.Add(scratchTrack);}
        Envelope existing=scratchTrack.Envelopes.FindByType(EnvelopeType.Volume);if(existing!=null)scratchTrack.Envelopes.Remove(existing);
        foreach (CurveType type in new CurveType[] {CurveType.Linear, CurveType.Fast, CurveType.Slow, CurveType.Smooth, CurveType.Sharp, CurveType.None}) {
            try {
                Envelope env = new Envelope(EnvelopeType.Volume);
                scratchTrack.Envelopes.Add(env);
                env.Points.Clear();env.Points[0].Y=0;env.Points[0].Curve=type;env.Points.Add(new EnvelopePoint(Timecode.FromSeconds(1), 1, CurveType.Linear));
                List<double> samples = new List<double>();
                for (int i=0;i<=256;i++) samples.Add(env.ValueAt(Timecode.FromSeconds(i/256.0)));
                result[type.ToString()] = samples;
                scratchTrack.Envelopes.Remove(env);
            } catch(Exception ex) { errors.Add("Native curve " + type + ": " + ex.GetBaseException().Message); }
        }
        }
        }
        return result;
    }
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
        report["format"] = "LQTAC VEGAS bridge"; report["version"] = 1;
        report["exporterVersion"] = "0.5.0";
        if (vegas.Project.IsUntitled || vegas.Project.IsModified || !File.Exists(vegas.Project.FilePath)) throw new Exception("Guarda los cambios del proyecto en VEGAS antes de exportar el puente. El script no guarda ni modifica el VEG.");
        report["sourceSha256"] = HashFile(vegas.Project.FilePath);
        report["nativeCurves"] = NativeCurves(vegas);
        report["createdUtc"] = DateTime.UtcNow.ToString("o"); report["vegasVersion"] = vegas.Version;
        report["apiAssembly"] = typeof(Vegas).Assembly.FullName;
        report["project"] = Props(vegas.Project, "FilePath Length IsModified IsUntitled");
        report["video"] = Props(vegas.Project.Video, "Width Height FrameRate PixelAspectRatio FieldOrder PixelFormat FullResolutionRenderQuality");
        report["audio"] = Props(vegas.Project.Audio, "SampleRate BitDepth MasterBusMode NumberOfStereoBuses");
        List<object> tracks = new List<object>(); int trackIndex = 0;
        foreach (Track track in vegas.Project.Tracks) {
            Dictionary<string, object> t = Props(track, "Index Name MediaType Mute Solo Volume PanX PanY PanCenter InvertPhase CompositeLevel CompositeMode CompositeNestingLevel IsAdjustmentTrack");
            t["bus"] = Props(Read(track,"BusTrack"), "Index Name PanType Mute Solo");
            t["id"] = "track-" + trackIndex++;
            t["effects"] = Effects(track); t["envelopes"] = Envelopes(track);
            t["motion"] = Motion(Read(track, "TrackMotion"));
            if (track is VideoTrack && ((VideoTrack)track).CompositeNestingLevel > 0) t["parentMotion"] = Motion(Read(track, "ParentTrackMotion"));
            List<object> events = new List<object>(); int eventIndex = 0;
            foreach (TrackEvent ev in track.Events) {
                Dictionary<string, object> e = Props(ev, "Index Name MediaType Start Length End PlaybackRate Mute Loop IsGrouped SyncOffset Gain Normalize NormalizeGain Channels InvertPhase PitchLock PitchSemis ChannelMode ResampleMode MaintainAspectRatio ReduceInterlace FlickerRemoval IsAdjustmentEvent SourceStreamIndex SourceFirstChannel SourceNumOfChannels UnderSampleRate");
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
        if(vegas.Project.IsModified || HashFile(vegas.Project.FilePath)!=(string)report["sourceSha256"]) throw new Exception("El proyecto cambio durante la lectura. Exporta otra vez.");
        output = vegas.Project.FilePath + "." + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N").Substring(0,8) + ".lqtac.json";
        JavaScriptSerializer serializer = new JavaScriptSerializer(); serializer.MaxJsonLength = 100 * 1024 * 1024;
        string temporary = output + ".tmp";
        File.WriteAllText(temporary, serializer.Serialize(report), new UTF8Encoding(false)); File.Move(temporary, output);
        if (OutputPath != null) { File.WriteAllText(OutputPath + ".tmp", output, new UTF8Encoding(false)); File.Move(OutputPath + ".tmp", OutputPath); }
        if (!Automated) MessageBox.Show("Puente exportado sin modificar el VEG.\nPistas: " + tracks.Count + "\nErrores de lectura: " + errors.Count + "\n\n" + output + "\n\nEn LQTAC pulsa Abrir proyecto VEGAS y elige el .veg original.", "LQTAC - Exportar puente VEGAS");
    }
}
