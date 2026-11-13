<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep team connections in the root TeamSessionProvider so navigation between dashboard and absences never disconnects a member.
- Use hashed per-tab capability leases for name-only member status writes; use database-validated user_roles for manager edits, never browser identity as authorization.
- Both lists read list_member_presence so disconnected members display Offline even when unload delivery fails; heartbeats never overwrite manual status.
- Members can only write through capability RPCs; published clients that use direct writes require republishing after the write-protection migration.
- Share the personal pause reminder across team views; use per-tab dismissal/sound markers and gesture-unlocked browser audio to avoid repeating a chime during navigation.
