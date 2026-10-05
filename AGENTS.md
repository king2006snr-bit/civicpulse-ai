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

- Landing page motion lives in CSS utilities in `src/styles.css` (`animate-rise`, `civic-flow-x/y`, `civic-glow`, `civic-grid-fade`, `civic-text-gradient`) rather than a JS animation library, so no motion dependency is added and `prefers-reduced-motion` disables it in one place.
- Marketing copy on `/` (hero title, subtitle, supporting line, role cards, 4-step flow) is user-authored and must stay verbatim unless the user rewrites it.
- Sign-in is mocked in `src/lib/mock-auth.ts` (frontend only, no backend yet) so the demo stays runnable without a database; swap this module for Lovable Cloud auth when the user asks for a real backend.
