
UP NEXT:

- [x] PATHSSSS
- [x] how to add? ~simpler one is: point, segment, point.
	- have a `pendingPath`
	- need to be able to find segments adjacent to a point
		should be quite doable.
- [ ] HOVERRRR to add. and then 'enter' to commit.
- [ ] Some intersections (where there are multiple intersections) aren't working.


FUTURE TOOLS:

- [ ] click 2 points, get the incircle
- [ ] 3 points, get the circumcircle

---

- [x] Looks like lineCircle intersection is wonky -- see example.
- [x] vertical lines are wrongg
- [x] make a way to export
	- The SVG, with the json embedded you fools.
	- Have the guides and junk be part of one layer, so it's easy to remove.
- [x] lets bake in really good undo/redo. should we do the whole tree?
	- but it doesn't get downloaded, right? or does it? could get a little big.
- [x] OH! undo across branches is broked.



sooo
for "mirrored paths"
...
...
i think my current concept of groups is probably weird.
anyway,
1st pass = just create separate things, you can shift+select I guess to format them at the same time.
- oooh ok so you can like double-click a path, and it will select the other paths that are its siblings.
- oh and I had a "select all things with this fill", which I could do again. so lets go on this path (heh) for a while.

2nd pass = maybe have just one instance, with nested configurations according to the mirrors at play? idk.


THEN

make sure multiple mirrors is working!

THEN


DONT FORGET:
- need to put points in the middle of circles, probably.
	- NOPE