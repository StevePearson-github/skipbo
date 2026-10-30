# Skip-Bo variants, house rules, configurable options, and computer-player strategy

## Official and popular variants and house rules

### Takeaway
The core game is well defined (162 cards, 30-card stock for 2-4 players, 20 for 5-6). The documented variations are small: shorter stock (10-15 cards), multi-round point scoring to 500, partnership play, and Mattel's spin-off editions. Web sources on house rules are thin and often low quality.

### Cited Findings
- Deck is 162 cards: twelve each of 1-12 plus eighteen Skip-Bo wilds. Minnie Hazel "Skip" Bowman began producing it in 1967; it is a commercial version of Spite and Malice; Mattel later acquired it. — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo)
- Stock pile is 30 cards for 2-4 players and 20 for 5+ players; hand refills to 5; up to four shared build piles; up to four personal discard piles; only the top discard is playable. — [GameRules.com](https://gamerules.com/rules/skip-bo/)
- Quick game: deal 10 cards to each stock pile, all other rules unchanged (Mattel sheet wording as quoted by search result). — [Mattel instruction sheet N7808](https://service.mattel.com/instruction_sheets/N7808.pdf); also [Diabolical Plots review](https://www.diabolicalplots.com/tabletop-game-review-skip-bo/). Wikipedia says 10 to 15 for a faster game — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo)
- Turn flow: refill to 5; play from hand, stock top, or any discard top; if you play all 5 hand cards, draw 5 more and continue; end turn by discarding one card; a build pile is removed at 12. — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo)
- Multi-round scoring: round winner gets 25 points plus 5 per card left in each opponent's stock; first to 500 wins. — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo), [GameRules.com](https://gamerules.com/rules/skip-bo/)
- Team play: partnerships (up to three teams for 6+ players); teammates share stock and discard piles, and the partner must stay silent on the active player's turn. — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo)
- Mattel editions: Skip-Bo Masters (168 cards plus 72 coins, 2-6 players, coins add a "strategic twist"); Skip-Bo Express (2 players, 56 cards, rules changed for speed); Skip-Bo Junior (112 cards, 2 levels of play, young children). The coin mechanic and Express rule changes were not detailed in anything I could access. — [Mattel Masters](https://shop.mattel.com/products/skip-bo-masters-hjr21), [Mattel Express](https://shop.mattel.com/products/skip-bo-express-hwv20), [Mattel Junior](https://shop.mattel.com/products/skip-bo-junior-hhb37)
- Homemade variant: adding jokers as extra wilds; also mentioned: team play. Source quality is low. — [openpension.ctdata.org](https://openpension.ctdata.org/skip-the-games-south-jersey)

### Inferences
- Reasonable rule options for a digital version, all low-cost to implement: stock size (5-30, presets 10/20/30; default 30 for 2-4, 20 for 5-6); number of wilds (0, 9, 18 default, 27); hand size (default 5; 4-7); number of discard piles (4 default); number of build piles (4 default); build-pile clear at 12 (standard) on/off; first-turn / who starts; game mode single round vs. play to N points (25 + 5/card, target 500; offer 100/250/500) vs. first-to-N wins; team play for 4 or 6 players (shared stock/discards need design decision: the Wikipedia rule implies teammates alternate on shared piles); "quick game" preset = stock 10.
- Because this is shared-screen hot-seat, a "hide hand between turns / pass-device screen" option is more important than any rule variant (not researched; design inference).
- Skip Masters coins and Junior/Express rules are not documented in my sources; recommend not cloning them.

### Gaps
- Exact Mattel Masters coin rules and Express/Junior rule changes: product pages only give marketing copy.
- Mattel instruction PDFs were not machine-readable via fetch; official text was only seen as search-snippet quotes.
- Ordering rule for team shared piles and rule for what happens when the draw pile runs out (typically reshuffle completed build piles) not verified in a fetched source.

## Options offered by digital implementations

### Takeaway
Evidence is sparse: digital versions seen offer AI difficulty levels, stock size choice, and helper features; no source showed a full options menu.

### Cited Findings
- "Skip-Bo Free" listing: 3 difficulty levels, 9 opponents, selectable stockpile size (publisher unverified). — [rawg.io](https://rawg.io/games/skip-bo-free)
- Official Mattel163 app: App Store reviews request a larger stock and adjustable online stock-size setting (10 vs 5), suggesting stock size is limited there. — [App Store](https://apps.apple.com/ca/app/skip-bo/id1538912205)
- Web-Bo (browser Skip-Bo clone): 4 AI levels (Easy makes mistakes and plays defensively; Medium uses standard strategy and saves jokers; Hard plays aggressively and uses discard piles efficiently; Ultimate plans ahead with a "Deep Search Algorithm"); also buy-a-joker, undo (once per game) and "Smart Help" hint. — [Docker Hub lx-games](https://hub.docker.com/r/lxtools/lx-games)
- Open-source: Kunalmighty/SkipBo (C++, HumanPlayer/AIPlayer subclasses, undo/redo); Rambou/Skip-Bo (Java GUI with special cards). AI internals not documented in READMEs. — [Kunalmighty](https://github.com/Kunalmighty/SkipBo), [Rambou](https://github.com/Rambou/Skip-Bo)

### Inferences
- Worth including: undo (hot-seat friendly, also during own turn), hint/suggest-move, 3 AI levels, stock size, score target, player count with mix of human/AI seats, card-count/pile-size display.

### Gaps
- No full option list of any commercial Skip-Bo app was found; app settings screens not accessible.

## Winning strategy heuristics

### Takeaway
Sources agree on a few principles: prioritize the stock pile, time Skip-Bo wilds carefully (generally last), organize discard piles deliberately, and avoid feeding opponents. Detailed heuristics below are mostly my own reasoning, not cited.

### Cited Findings
- Prioritize playing from the stock pile; blocking is a key defensive tactic; organize discard piles; avoid setting up the next player; time wild use. — search summary of [boardinthecity](https://www.boardinthecity.co.uk/?p=569) and similar (low-quality set; treat as generic)
- Save Skip-Bo wilds for last (community comments). — [BoardGaming.com tips](https://boardgaming.com/gametips/skip-bo) (page returned 404 on fetch; snippet only)
- Discard organization affects the whole game; only top discard is playable, so plan which cards to bury. — [Diabolical Plots](https://www.diabolicalplots.com/tabletop-game-review-skip-bo/), [GameRules.com](https://gamerules.com/rules/skip-bo/)

### Inferences (uncited; standard Spite-and-Malice-family reasoning)
- Move priority per turn: (1) play stock top whenever legal (always, even using a wild if it is the stock card, unless a cheaper wild-free sequence is possible next); (2) play hand/discard cards that enable the stock card next (e.g., stock is 7: build a pile to 6 using hand/discard cards, or hold the 6 and play it just before the 7); (3) play cards from discard piles (frees pile and exposes next card); (4) play hand cards that empty the hand (draws 5 new) if no downside; (5) otherwise discard.
- Don't advance a build pile to N-1 where an opponent's stock card is N (opponent-stock-aware blocking). With hot-seat, stock tops are visible so an AI can compute exactly.
- Wild conservation: use a wild only if it plays the stock card, finishes a chain of >=2 stock-useful plays, or hand would otherwise be stuck; never waste a wild as a discard unless forced.
- Discard strategy: build descending piles on the discard stacks (e.g., 12 at bottom, lower on top) so the top is always playable soon; place a card on a pile whose top is one higher; keep low cards accessible; put wilds and cards the stock needs soon on a pile with nothing important below or keep them in hand; avoid burying a card the stock pile needs (compute which values the stock will need soon: stock top and, for known order, following stock cards are not visible, only the top is); dump high cards (12s) as bottoms of piles or as pile-starters; one empty discard pile is valuable, don't fill all four early.
- Do not leave a build pile at a value that gives opponents their stock card; prefer to complete piles to 12 when you can to clear them.

### Gaps
- No rigorous study (e.g., solved/simulated Skip-Bo) found; strategy articles in search results were largely generic or auto-generated (ticketlog, studentbridge, pacertboard, polygraph pages appear low quality and were not used).

## Algorithmic approaches for Easy/Medium/Hard AI

### Takeaway
No documented implementations were found, so this is design guidance. Web-Bo's tier descriptions (mistakes/defensive -> standard with saved jokers -> aggressive discard use -> search) provide a precedent.

### Cited Findings
- Web-Bo tiers as above. — [Docker Hub lx-games](https://hub.docker.com/r/lxtools/lx-games)

### Inferences (design proposals)
- Easy: each turn, enumerate legal moves; with probability p (~0.5-0.7) play a random legal play, otherwise stop playing early and discard random card; may ignore stock priority; uses wilds freely; ignores blocking.
- Medium (greedy heuristic): fixed priority list (stock > discard-top plays enabling > hand plays > wilds last), discards by simple scoring (avoid burying low cards, prefer placing on pile with top = card+1, or empty pile), no opponent modelling beyond not creating immediate stock gift.
- Hard (scored search): evaluate each candidate move by a weighted function: +big for stock play; + for reducing stock progress distance; - for using a wild; - for building pile to N-1 when any opponent stock top (or discard top) is N (opponent gift penalty, scaled by opponent stock remaining); + for creating ordered (descending) discard piles; - for burying a card equal to stock-needed values; + for keeping an empty discard pile; + for hand-emptying plays (extra draw). Because a turn is a sequence of plays, do depth-first search over ordering of plays within the turn (branching is small: ~5 hand + stock + 4 discards x 4 build piles) with memo/pruning, score the end state after the mandatory discard, pick best. Optionally 1-ply opponent lookahead using visible tops (draw pile unknown; use expectimax/Monte Carlo sampling from the unseen card distribution). Monte Carlo rollouts with the Medium policy are a cheap upgrade path.
- Make AI difficulty a parameter set (weights, error rate, search depth) rather than separate code, so tiers share one engine. Add per-turn think delay animation for UX.
- Tuning: self-play tournaments among tiers (Hard should win >70% vs Medium; Medium >70% vs Easy) to calibrate weights.

### Gaps
- Kunalmighty AIPlayer.cpp source and Web-Bo internals were not read; actual published heuristics could refine weights.
