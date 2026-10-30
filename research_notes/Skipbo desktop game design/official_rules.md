# Official Mattel Skip-Bo Rules (implementation-ready)

Primary sources (Mattel PDFs, text extracted locally with pdftotext): [42050 (2009 text, rev 0920/0922)](https://service.mattel.com/instruction_sheets/42050-0920.pdf), [R7311 (0920)](https://service.mattel.com/instruction_sheets/R7311-0920.pdf), [N7808 Deluxe tin](https://service.mattel.com/instruction_sheets/N7808.pdf). All three contain identical rules text. Secondary: [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo), [officialgamerules.org](https://officialgamerules.org/game-rules/skip-bo/). Pagat.com URL guessed (stops/skipbo.html) returned 404; not used.

## Deck composition, stock size, hand size, pile counts

### Takeaway
162 cards: 12 copies each of 1-12 (144) + 18 Skip-Bo wilds. Stock = 30 cards for 2-4 players, 20 for 5+ (box says 2-6 players). Hand 5, up to 4 shared building piles, up to 4 discard piles per player.

### Cited Findings
- "A deck with 144 cards numbered 1 through 12 plus 18 SKIP-BO cards for a total of 162. Remove any blank cards - these are not used during play." — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- 144/12 = 12 copies of each number; Wikipedia states "twelve each of 1-12 and eighteen" Skip-Bo — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo). (Mattel sheet gives only totals; per-number count of 12 is from Wikipedia/arithmetic.)
- "When there are 2 to 4 players, the dealer deals 30 cards to each player. With 5 or more players, 20 cards are dealt." Dealt face down = STOCK pile; top card turned face up — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Package player count printed "2-6", age 7+ — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Short game: deal 10 stock cards each, all other rules same — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf). Wikipedia suggests 10-15 for faster games — [Wikipedia](https://en.wikipedia.org/wiki/Skip-Bo)
- Hand: draw 5 cards. Up to four BUILDING piles, shared, in center; each player has one STOCK pile and up to 4 DISCARD piles (left of stock). Remaining deck after deal = face-down DRAW pile. Building and discard areas are empty at start — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Discard piles: "build up any number of cards in any order... but may only play the top card" — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)

### Inferences
- Draw pile size after deal: 2p 162-60-0=102 (before hands); 3p 72; 4p 42; 5p 62; 6p 42 (hands drawn from this).
- 4 players at 30 stock leaves 42 cards: enough for 4 hands of 5 (20) plus 22 spare; fine.

### Gaps
- Mattel gives no stock size for 5-6 players beyond "5 or more" = 20.

## Turn structure

### Takeaway
Draw to 5 (first turn: draw 5), play any number of cards to building piles from hand / stock top / discard tops, refill 5 immediately if all hand cards are played, end turn by discarding exactly one hand card.

### Cited Findings
- First player: "The person to the left of the dealer starts." Dealer: each player draws a card after shuffle, highest card deals (Skip-Bo cards don't count); deal moves left after each game — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Turn 1: draw 5. A Skip-Bo or 1 (on top of stock or in hand) can start a building pile; then continue playing stock cards onto building piles. "If you play all 5 cards, draw 5 more and continue playing." "If you can't make a play or just don't want to, end your turn by discarding one of the cards from your hand onto one of your four DISCARD piles." — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Second and later turns: "first draw enough cards to bring your hand back up to 5." Then play top of STOCK, top of a DISCARD pile, or from hand onto BUILDING piles in sequential order. Advice: use stock cards first — [Mattel N7808](https://service.mattel.com/instruction_sheets/N7808.pdf)
- Building piles: only a 1 or Skip-Bo starts one; built 1 through 12 in sequence; "Once a pile of 12 cards has been completed, it is removed, and a new pile is started in its place." — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- Draw pile empty: "the cards from the completed BUILDING piles are shuffled and become the new DRAW pile." — [Mattel N7808](https://service.mattel.com/instruction_sheets/N7808.pdf)
- When a stock top card is played, the next stock card is turned face up (implied by "top card of the pile always turned face-up") — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- Discarding to end the turn does not trigger a refill; refill occurs only when the hand is emptied by plays (turn-ending discard happens after) — [officialgamerules.org](https://officialgamerules.org/game-rules/skip-bo/) (secondary; consistent with Mattel text)

### Inferences
- Discard is the turn terminator; a turn cannot end without a discard in Mattel's wording, except when winning (stock emptied). Implement: turn ends only via discard (or win). If hand empties via plays, draw 5 and keep going; you must always still end with a discard.
- A discard pile can be chosen freely among the 4; any card (incl. Skip-Bo) may go on any pile.
- Completed 12-pile cards (including wilds) are recycled; wilds return to the draw pile as Skip-Bo again.
- Mattel does not say a player may discard if their hand is empty at end of play; practically the player has 5 cards after refill, so hand is never empty at discard time unless the draw pile is exhausted (see edge cases).

### Gaps
- Mattel text does not explicitly say whether you may play a card to a building pile after refilling mid-turn in the same turn: it says "draw 5 more and continue playing", so yes.

## Winning and scoring

### Takeaway
First player to empty their stock pile wins immediately (even with cards in hand/discards). Optional match scoring: 25 + 5 per card remaining in opponents' stock; first to 500.

### Cited Findings
- "The first player to use up all the cards in his/her STOCK pile wins." — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Scoring: winner gets 5 points per card remaining in opponents' STOCK piles plus 25 for winning; first to 500 wins — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf)
- Partnership: each side's two stocks; game over when both stocks of one partnership are finished; partners can use each other's stock and discard piles on their turn; cheating penalty is taking 2 draw cards into one's stock — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)

### Inferences
- Because turns are sequential, ties are impossible in standard play; the first to empty stock ends the game.

### Gaps
- Mattel does not mention a tie-break for match scoring if two players pass 500 (only one can score per game, so only possible across games; not addressed anywhere I found).

## Wild cards and edge cases

### Takeaway
Skip-Bo cards are wild and may be any 1-12 at the player's choice. Mattel does not explicitly address wilds in stock/discard, but they are playable cards like any other.

### Cited Findings
- "SKIP-BO cards are wild. This is important." They can start a building pile and "can be played as any other number, too." — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- Mattel explicitly says a Skip-Bo "on top of your STOCK pile or in your hand" can start a building pile — [Mattel R7311](https://service.mattel.com/instruction_sheets/R7311-0920.pdf). So wilds can sit on stock (dealt there randomly).
- Wild in discard pile: not explicitly stated; only top card is playable, so playable as wild when on top — [officialgamerules.org](https://officialgamerules.org/game-rules/skip-bo/) (secondary, itself an inference). Mattel's "Partner, play your SKIP-BO as a 4" example confirms the player declares the value — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- Draw too many cards: shuffle the extra into own stock pile; out-of-turn play rules (illegal turn stops; offender plays next turn without drawing) — [Mattel 42050](https://service.mattel.com/instruction_sheets/42050-0920.pdf)
- Wild value fixed by position in the building pile when played (player declares; sideways placement is a physical convention only) — [officialgamerules.org](https://officialgamerules.org/game-rules/skip-bo/)

### Inferences
- A pile's wild value is determined by its position (current top + 1); in a digital version, auto-assign the value (only one legal value exists for a given pile), so no choice dialog beyond selecting the target pile.
- A wild played as the 12th card completes and clears the pile.
- A building pile cannot go past 12, so a 12 (or wild at 11) is the last card; piles clear immediately and the slot is available again.
- If all 4 building piles exist, a 1 cannot be played until one clears (only matters for starting a new pile; piles can't be started with non-1 non-wild). Max 4 simultaneous piles is "up to four" per Mattel.
- Draw pile empty and recycle: shuffle all completed building piles into new draw pile. Never shuffle stock or discards in. If draw pile is empty and no completed piles exist, Mattel is silent; reasonable implementation is to draw as many as available (player proceeds with a short hand), and if the hand is empty at discard time the turn simply ends (or play passes). Flag as design decision.
- Recycle timing: Mattel says "if the DRAW pile is used up"; implement lazily when a draw is needed and the pile is empty.

### Gaps and discrepancies
- First player: Mattel = left of dealer, dealer = highest card; [officialgamerules.org](https://officialgamerules.org/game-rules/skip-bo/) claims "youngest player goes first" (cites a "JMM20" rules version I could not verify; not in the Mattel sheets I read). Wikipedia text on first player ("middle age") was unclear. Treat Mattel's rule as authoritative; digital version can pick random/ rotating start.
- Wikipedia and officialgamerules suggest 6+ players use teams; Mattel box says 2-6 players and 5+ get 20 stock. Wikipedia: "2-4 individually, or 6+ in teams" differs from Mattel; Mattel preferred.
- Mattel says "up to four" building piles; some house rules differ (e.g., different pile counts, mandatory stock-first, allowing discard from pile order) — not official.
- Mattel does not state whether the draw pile reshuffle includes the hands, nor tie/empty-draw-and-no-completed-pile conditions (gap above).
- Mattel's Deluxe sheet N7808 lists the Deluxe tin's items and repeats the same rules; no rule differences found among 42050, R7311, N7808 (apart from a typo in N7808 special situation 3 saying "DISCARD or STOCK piles" vs 42050 "DISCARD or BUILDING piles").
- Not verified: BoardGameGeek discussions (not fetched), Pagat page (404).
