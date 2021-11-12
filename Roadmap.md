
## What textures?

soo
question

what would it take ...
... to get it so I could make jerd
export a js + shader whatsit
that could consume State & draw these dealios?

I'd need to be able to SDF it up
which, that's super easy.
and then what about "consuming an array of polygons,
the number might change from scene to scene"?

I'd like to be able to have the "count of polygons" be like
set as a toplevel #define, and so my js code could just find & replace
that before compiling. That sounds cool.

Alternatively, would it be better/faster/idk to /inline/ all of the items?
if we're generating the shader on the fly anyway....
just have one supermassive "hard-coded" sdf?
now, if I didn't hard-code it, then I could
concievably do live update.
But that sounds fraught.




https://www.shadertoy.com/view/XdSSWd
Can I ... render watercolors for each cell?
might be a little extra
but like, should be doable? idk.

https://www.shadertoy.com/view/4lV3RG
https://www.shadertoy.com/view/MsSGD1
https://www.shadertoy.com/view/ldXfRj
https://www.shadertoy.com/view/XtVGD1

https://www.shadertoy.com/view/WtjGRc - maybe do a papercraft look?
- different shapes at different levels?

this has a nice, very subtle noise to it
https://www.shadertoy.com/view/ltl3RH

interesting bumpy noise https://www.shadertoy.com/view/4tj3DG


ooh this has a veryy pleasing paper background:
https://www.shadertoy.com/view/3d3cR2


ooh this is also extremely good
https://www.shadertoy.com/view/3dtBWX


cool effect
https://www.shadertoy.com/view/llKyRz

cactus https://www.shadertoy.com/view/4tdyRj



here's my fork of the thing implementing that paper:
https://www.shadertoy.com/view/Nt33Wj



ok but this is just really interesting looking https://www.shadertoy.com/view/MlKSDm


yeah I love the grain they achieve on this one:
https://www.shadertoy.com/view/wljfDw


for metal if I want https://www.shadertoy.com/view/wlXXRn


oh hey it's an actual implementation of the paper
https://www.shadertoy.com/view/wsKfWG
interactive.


this is quite beautiful
https://www.shadertoy.com/view/WdlyRS


ooh this is very good
https://www.shadertoy.com/view/wlXcDS

pretty decent pattern https://www.shadertoy.com/view/llsXDf

nother texture https://www.shadertoy.com/view/3ljXRw







THe most FUN:

## It would be super cool
to generate a pseudo-timelapse of creating one of the designs.
given that I have the full history, it should be doable?
like for starters, I could just advance the UNDO and snapshot 🤔

or just, have screenrecord going, and make a "demo mode".
Yeah that could be fun.

Make a little animated cursor that goes around, doind the things...


UP NEXT:

- [ ] delete a path my folks
- [x] when making a path, hide intersections.
- [x] disabled guides should still show up, but faint
- [ ] create mirrors! be able to define them.
- [ ] maybe have a way to re-jigger a path around a new mirror?
- [ ] make a background to indicate transparency
- [ ] definitely do the "palette for line widths" thing.
- [ ] ORDERING pleasseee

- [ ] when you click a path, it should bring up a hover menu right where your
	mouse is, to edit the path. That would be so much better.

I think.... maybe .... that guides should just create-all, just the same
as paths.
So that modifying a mirror doesn't change anything.

Which would mean that the only reason to do multiple mirrors would be for nesting.

- [ ] it would be really nice to be able to /combine/ paths, to do a cut-out, you know?


- [ ] ooooh ok, so when you're drawing a path,
	have a shortcut you can hit that will zoom in on the current mouse
	position, until you release the key.
	like "shift". That would be so rad.

- [ ] some of my intersections aren't as precise as I would like. What can I do about this?


- [x] background


Should I do a similar palette thing for line widths?
Like, sizes "small", "medium", "large", and "largest"
and everything defaults to "small"



HOW to share maximally twitter
I assume twitter will re-encode the .png, and lose the metadata.

- maybe a cloudflare worker, which ... produces the html on-demand?
	how do I twitter card it up, is the real question.

## Basic usability stuff

- [ ] need to allow paths that are just lines
- [ ] multi-select paths please
- [ ] "hiding" a guide, should be cmd-click or something, and normal click should just select it.


## Palettes, right?

- [x] paste in a palette, love it
- [x] export palettes
- [ ] drag & drop palettes, please
	- I don't know what this was supposed to mean

So, it would be nice to be able to try out different colorings of a pattern
and like, to switch between them.

So, basic level: path's "fill" is a number, which indexes into the current palette array.
When you change the current palette array, all the fills change.

But what if the new palette has /fewer/ items? How do we indicate what the fallback should be?

Maybe we just show those as empty, it's fine, and you can add more items if you want, or change the group, yeah.

OK so fill could /either/ be a custom css string, or an index into a palette.


## Plop an image in there!

2 goals:
- [ ] sample colors! Love it tons
- [ ] copy existing dealios! will need zooms and such for that. how to do it, idk.
	- I think that images won't be part of history. They're big.
	- instead, I will have an 'attachments' dict, that doesn't get historied.
	- but the visible whatsit of the thing can be history, that's fine.


- [x] exporting an image... let's allow png export folks.
	- Sooo stretch goal that would be fun, apparently you can embed whatever you want into png metadata. We could stuff the json in there


- [ ] ok I actually have to deal with the sweep flag folks.
- [ ] click  guide to hide it. undo brings it back of course.
- [x] hoveing a guide on the side should preview it on the screen.

- [ ] track down those bugs
	- [ ] I was getting something from the wrong circle
	- [ ] an intersection didn't have all offshoots





- [x] PATHSSSS
- [x] how to add? ~simpler one is: point, segment, point.
	- have a `pendingPath`
	- need to be able to find segments adjacent to a point
		should be quite doable.
- [x] HOVERRRR to add. and then 'enter' to commit.
- [x] Some intersections (where there are multiple intersections) aren't working.
- [x] Mirrors for paths my folks! Need to update the Undo to remove a bunch of ids. But should be fine.
- [x] Style! Got to have style!
- [x] profit? like this is so gooood.
- [x] hide guides
- [x] almost-tangent circles should report connection.
- [x] color things my folks.
- [x] hover so good
- [x] let's go ahead and show the Mirrors! So we know where they are pointed and such.
- [x] CIRCLE IS TANGENT, need to fix.
- [x] add option to NOT extend a line. can keep things a lot cleaner.
	- maybe like 'capital L' is for line that doesn't extend? idk
	- orr hold shift while placing the second point?
- [x] flip? does it work?

# WHAT does hover-to-add look like?
- first off, not through actions. don't need to save that nonsense.
- at p = 0
	- show offshoots of p0
- at p > 0
	- show offshoots of the prev, and offshoots of the current.
- hovering an already-chosen line rolls back to that one.



FUTURE TOOLS:

- [x] click 3 points, get the incircle
- [x] 3 points, get the circumcircle

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