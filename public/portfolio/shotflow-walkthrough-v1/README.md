# ShotFlow walkthrough assets

These are authentic screenshots and short recordings of the native ShotFlow app, captured on 17 September 2026 using an isolated iPhone 15 Pro Max simulator. The app reports version **0.1.0, build 15**, running on **iOS 26.5** in English and Dark appearance. Full-size captures are **1290 × 2796** pixels.

The example project is **Nightfall**: two source videos, six shots, and shots 1–2 initially completed. Project metadata, completed analysis states, shot ranges, shooting suggestions, and initial checklist marks are deliberately staged demonstration data. They are not evidence of a new model analysis or its accuracy.

The two 12-second source clips were made from four existing app resources: `ShotFlowIOS/ShotFlowApp/Resources/reference-portrait.png`, `thumb-corridor.png`, `thumb-product.png`, and `thumb-sunset.png`. Each clip contains three four-second sections, using proportional crops and slight pan/zoom. No new scene illustrations, text overlays, or outside footage were added. Source-image checksums and the exact order are in [provenance.json](provenance.json).

The interaction recordings show real native controls. Shot 3 starts at **8.000–12.000 seconds**; moving its start to **9.163 seconds** leaves **2.84 seconds** in the native display. Saving preserves the source video and keeps the warning that shot suggestions need review. In the professional camera guide, **Mark this shot complete** saves the checklist and automatically selects shot 4. The next-shot capture shows **3/6 shots completed**.

| Recording | Length | Format |
| --- | --- | --- |
| `reference-playback.mp4` | 4.65 s | 1290 × 2796, H.264 in MP4, fast-start, no audio track |
| `trim-adjustment.mp4` | 6.40 s | 1290 × 2796, H.264 in MP4, fast-start, no audio track |

The videos preserve continuous native actions; only inactive time before and after the demonstrations was removed. Both files were fully decoded after export. Images were proportionally exported as WebP at quality 95, without repainting or reconstructing the UI. The 800-pixel variants preserve their original proportions.

`storyboard-overview` captures the top of the source-group list for the case study; `storyboard` is scrolled to shot 3 for the guided demonstration. `field` and `completed` show the full-screen professional-camera guide. `next-shot` shows the native checklist after closing that guide. The website combines these captured states with guided controls; it is not a live iOS emulator or a public app release.
