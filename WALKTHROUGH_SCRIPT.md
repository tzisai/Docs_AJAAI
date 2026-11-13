# One-pass walkthrough — target 4 minutes

## Prepare before recording

Use the verified release URL, not a development build. Open Alice in a normal window and Bob in a private window or separate browser profile, signed in already. Put both windows side by side. Keep `samples/team-notes.txt` accessible in the file picker. Close dashboards and terminals containing secrets. Use sample text only. Start with a new document so Bob's before-sharing denial is genuine. Confirm the final checks in CHECKS.md and record only claims supported there.

## Recording

**0:00–0:30 — Context and create.** “This is a focused document workspace. Owners edit; teammates get read access.” Show Alice's library, My documents and Shared with me. Create a fresh document and rename it “Team decisions”.

**0:30–1:15 — Edit and persist.** Type a heading and a couple of lines. Demonstrate heading style, bold/italic/underline, and bulleted/numbered lists. Point out pressed states. Save with Ctrl/Cmd+S, wait for Saved, then refresh the direct editor URL. Show the same title and formatting.

**1:15–1:50 — Import.** Go to Library. Show “UTF-8 .txt · up to 100 KiB”. Import team-notes.txt. Explain that the filename becomes the title, blank lines survive, and literal markup stays text. Refresh. “We store only converted Tiptap JSON, not the original binary.”

**1:50–2:45 — Two-user sharing.** Copy a fresh private document URL into Bob's window. Show denial before sharing. In Alice's window open Share, pick Bob, and grant read access. Refresh Bob. Show the read-only indicator and absence of editing controls. Go to Bob's library and show Shared with me and Alice's owner label. “The database checks permission on every request; hiding buttons is not the security boundary.” Mention the ordinary-account denied write/grant checks if they actually passed.

**2:45–3:25 — Engineering choices.** “Render serves a Vite/React static site, Supabase handles password auth and durable Postgres. One migration holds constraints, column grants, and row security. Share ownership uses a composite foreign key to avoid recursive policies. Saves write title and body together; errors keep the draft.” Briefly show save state if convenient.

**3:25–4:00 — Scope and AI judgment.** “I cut shared editing, realtime sync, comments, extra formats, and local drafts. Owner tabs use last-save-wins.” “Codex sped up the UTF-8 converter and fixture tests. I replaced its initial manual history guard with Router's blocker. I verified with the build, import tests, and [only checks actually passed].” End on the readable document.

## After recording

Upload unlisted to Loom or YouTube. Open the link signed out and confirm playback. Replace WALKTHROUGH_URL.txt with the actual URL. Update SUBMISSION.md status and links. Rebuild the clean package, upload its contents to one Drive folder with Viewer access for reviewers, and verify that folder signed out. Do not claim private video/Drive access was verified until it was.
