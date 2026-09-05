"""Record scenes with Playwright, then assemble the demo MP4 with ffmpeg."""
import json, subprocess, html, urllib.parse, shutil, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
SITE = os.environ.get("SITE", "http://127.0.0.1:8811")  # local mirror of the deployed site; see README
TOKEN = os.environ["REVIEW_TOKEN"]
W, H = 1920, 1080

def dur(p): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(p)]).decode())

narr = {s["id"]: s["text"] for s in json.load(open(ROOT/"narration.json"))}
ndur = {k: dur(ROOT/f"wav/{k}.wav") for k in narr}

# ---- call scene schedule (abridged: drop the awkward beat we already fixed and the re-ask of the name)
turns = json.load(open(ROOT/"turns_en.json"))
KEEP = [0,1,2,3,4,5,12,13,15,16,18,19,20,29,30]
chat_at = round(ndur["s4_call"] + 1.0, 2)
t = chat_at + 0.8
sched, bot_audio = [], []
for i in KEEP:
    tr = turns[i]
    if tr["speaker"] == "bot":
        d = dur(ROOT/f"wav/bot_{i:02d}.wav")
        sched.append({"speaker":"bot","html":html.escape(tr["text"]),"at":round(t,2)})
        bot_audio.append((ROOT/f"wav/bot_{i:02d}.wav", t))
        t += d + 0.45
    else:
        sched.append({"speaker":"user","html":html.escape(tr["text"]),"at":round(t,2)})
        t += 1.0 + 0.035*len(tr["text"])
call_len = t + 2.0
print(f"call scene: chat starts {chat_at}s, ends {call_len:.1f}s")

# ---- scene list: (id, kind, seconds)
SCENES = [
    ("s1_title","card", ndur["s1_title"]+1.0),
    ("s2_form","site", ndur["s2_form"]+1.0),
    ("s3_submit","site", ndur["s3_submit"]+2.5),
    ("s4_call","card", call_len),
    ("s5_review","site", ndur["s5_review"]+1.0),
    ("s6_bahasa","site", ndur["s6_bahasa"]+1.0),
    ("s7_remind","site", ndur["s7_remind"]+1.0),
    ("s8_limits","card", ndur["s8_limits"]+1.0),
    ("s9_arch","card", ndur["s9_arch"]+1.2),
]

REC = ROOT/"rec"; shutil.rmtree(REC, ignore_errors=True); REC.mkdir()

def record(pw, sid, fn, seconds, site=False):
    b = pw.chromium.launch()
    vp = {"width":W,"height":H}
    ctx = b.new_context(ignore_https_errors=True, viewport=vp, record_video_dir=str(REC/sid), record_video_size={"width":W,"height":H}, device_scale_factor=1)
    pg = ctx.new_page()
    fn(pg, seconds)
    path = pg.video.path(); ctx.close(); b.close()
    out = REC/f"{sid}.webm"; shutil.move(path, out); return out

def card(name, query=""):
    def fn(pg, seconds):
        pg.goto(f"file://{ROOT/'scenes'/name}.html{query}"); pg.wait_for_timeout(int(seconds*1000))
    return fn

def zoom(pg, z=1.75): pg.evaluate(f"document.documentElement.style.zoom='{z}'")

def s2(pg, seconds):
    pg.goto(SITE); zoom(pg); pg.wait_for_timeout(2500)
    pg.click("button[data-l=es]"); pg.wait_for_timeout(2800)
    pg.click("button[data-l=id]"); pg.wait_for_timeout(2800)
    pg.click("button[data-l=en]"); pg.wait_for_timeout(1500)
    pg.select_option("#cc","52"); pg.wait_for_timeout(2800)
    pg.select_option("#cc","1"); pg.wait_for_timeout(int(max(0,seconds-12.4)*1000))

def s3(pg, seconds):
    pg.goto(SITE); zoom(pg, 1.4); pg.wait_for_timeout(800)
    pg.type("input[name=name]","Marcus Bell", delay=45)
    pg.type("input[name=num]","917 555 0142", delay=45)
    pg.type("input[name=email]","marcus@example.com", delay=35)
    pg.type("textarea[name=matter]","Contract dispute with a vendor", delay=30)
    pg.check("input[name=consent]"); pg.wait_for_timeout(600)
    pg.hover("button.go"); pg.wait_for_timeout(500)
    # Do not place a real call in the recording; show the real success state the page renders.
    pg.evaluate("""() => { const m=document.getElementById('msg'); m.className='msg ok';
      m.textContent='Calling you now at +19175550142 — please pick up. Thank you — an attorney will review your information and follow up.'; }""")
    pg.locator('#msg').scroll_into_view_if_needed(); pg.wait_for_timeout(int(max(0.5, seconds-6)*1000))

def review(pg):
    pg.goto(f"{SITE}/review.html"); zoom(pg, 1.55); pg.fill("#tok", TOKEN); pg.click("#load"); pg.wait_for_selector(".card dl", timeout=20000); pg.wait_for_timeout(800)

def s5(pg, seconds):
    review(pg)
    card_ = pg.locator(".card", has_text="Acme Corp").first
    card_.scroll_into_view_if_needed(); pg.wait_for_timeout(2500)
    card_.locator("details").evaluate("d => d.open = true"); pg.wait_for_timeout(1500)
    pg.mouse.wheel(0, 260); pg.wait_for_timeout(int(max(0.5, seconds-6.5)*1000))

def s6(pg, seconds):
    review(pg)
    card_ = pg.locator(".card", has_text="US · id").first
    card_.scroll_into_view_if_needed(); pg.wait_for_timeout(1500)
    card_.locator("details").evaluate("d => d.open = true"); pg.wait_for_timeout(300); card_.locator("details").scroll_into_view_if_needed(); pg.wait_for_timeout(int(max(0.5, seconds-3.5)*1000))

def s7(pg, seconds):
    review(pg)
    card_ = pg.locator(".card", has_text="Acme Corp").first
    inp = card_.locator("input[id^=when_]"); inp.scroll_into_view_if_needed(); pg.wait_for_timeout(800)
    inp.type("Tuesday Sept 9 at 10:00 AM", delay=45); pg.wait_for_timeout(600)
    card_.locator("button[data-remind]").hover(); pg.wait_for_timeout(int(max(0.5, seconds-4.5)*1000))

fns = {"s2_form":s2,"s3_submit":s3,"s5_review":s5,"s6_bahasa":s6,"s7_remind":s7}
q = "?s=" + urllib.parse.quote(json.dumps({"turns":sched,"chat_at":chat_at}))

clips = []
with sync_playwright() as pw:
    for sid, kind, secs in SCENES:
        fn = card(sid, q if sid=="s4_call" else "") if kind=="card" else fns[sid]
        out = record(pw, sid, fn, secs, site=(kind=="site")); d = dur(out); clips.append((sid, out, d)); print(f"{sid:10s} {d:5.1f}s")

# ---- assemble: concat video, place narration + bot audio at scene offsets, burn captions
offsets, t0 = {}, 0.0
for sid, out, d in clips: offsets[sid] = t0; t0 += d
total = t0; print("total", round(total,1))

(ROOT/"concat.txt").write_text("".join(f"file '{out}'\n" for _, out, _ in clips))
subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(ROOT/"concat.txt"),"-r","30","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p",str(ROOT/"video_silent.mp4")], check=True)

inputs, filters, labels = [], [], []
def add(path, at):
    i = len(inputs)//2; inputs.extend(["-i", str(path)])
    filters.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=mono,adelay={int(at*1000)}|{int(at*1000)}[a{i}]"); labels.append(f"[a{i}]")
for sid, _, _ in clips: add(ROOT/f"wav/{sid}.wav", offsets[sid]+0.4)
for p, at in bot_audio: add(p, offsets["s4_call"]+at)
fc = ";".join(filters) + f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0,volume=1.6,apad=whole_dur={total:.2f}[mix]"
subprocess.run(["ffmpeg","-y","-loglevel","error",*inputs,"-filter_complex",fc,"-map","[mix]","-c:a","aac","-b:a","160k",str(ROOT/"audio.m4a")], check=True)

# captions: narration text per scene, split into ~2 lines chunks across the narration duration
def srt_time(s): h=int(s//3600); m=int(s%3600//60); sec=s%60; return f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".",",")
lines, n = [], 1
for sid, _, _ in clips:
    text = narr[sid]; sentences = [s.strip() for s in text.replace("? ","?|").replace(". ",".|").replace("; ",";|").split("|") if s.strip()]
    tl = sum(len(s) for s in sentences); t = offsets[sid]+0.4; D = ndur[sid]
    for s in sentences:
        d = D*len(s)/tl; lines.append(f"{n}\n{srt_time(t)} --> {srt_time(t+d-0.05)}\n{s}\n"); t += d; n += 1
(ROOT/"captions.srt").write_text("\n".join(lines), encoding="utf-8")
style = "FontName=DejaVu Sans,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=4,BackColour=&H90101828,Outline=0,Shadow=0,MarginV=28,Alignment=2"
subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(ROOT/"video_silent.mp4"),"-i",str(ROOT/"audio.m4a"),"-vf",f"subtitles={ROOT/'captions.srt'}:force_style='{style}'","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","copy","-shortest","-movflags","+faststart",str(ROOT/"nota-intake-demo.mp4")], check=True)
print("done", round(dur(ROOT/"nota-intake-demo.mp4"),1), "s")
