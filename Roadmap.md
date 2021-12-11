

## Ok let's try different sized screens
to prepare for mobile ya know




- [x] REIFY GUIDES. Got to make mirrors and such.
- [x] so what about a "cut paths to clip" button? So that you can then do like some tilings with them.
- [ ] "join adjacent tiles" would be very nice"

- [ ] ifff a line goes backwards after inset, just delete that segment and recalculate?

- [ ] make a setting for "clip first, then inset" or "inset first, then clip".

- [x] remove style from groups! Instead, just mass-update the styles of paths.
- [ ] "clone style" would be very nice.
- [x] shortcuts for toggling mirrors! alt-m to toggle on/off, shift-m to cycle.
- [x] then, make a button to "group selected paths", which will change their grouping to a new group.
	- [ ] if all of one group is contained in the selection, the other paths are added to this group.

## [x] "Multiply path(s) around mirror
	- this would put the resulting paths in the same pathgroup as the original, and we'll also do deduping
		on pths in the same pathgroup.

- [x] button to remove path-level styles
- [ ] selection type for PathOrGroup thx
- [ ] shift-drag to resize overlay, so you don't have to zoom out. indicate via cursor.

- [x] also perf is really bad, I need to figure out what to memoize.



## Fancy Shader Goodness

How are we planning to do it?

So I tried "have every pixel know about every sub-path", and it didn't go well.
So, next plan:
iterate through all paths, and do a canvas render just for that path.
we can generate a shader that takes up to the max number of segments...
so that we don't have to recompile for every path. that's probably worth it.

and then we pass in the path as a uniform, ... still only supporting lines for the moment, no arcs.

And then, in the shader we compute:
- whether we're inside the path
- distance to closest edge
- "how far around" we are for that edge, and for the whole shape.

why am I doing this?
b/c I want to be able to draw fancy things, with noise.


## CLIPPSSSS

Ok, so one thing: we got issues when we have a starting point in the middle of an arc. apparently.

- [x] also, clip + inset is /not/ working! Maybe the resulting path is abnormal somehow? needs to be simplified?
	- yay fixed
- [x] um lots more bugs thoughhhh
- [x] missing star?
- [x] ok so bugs:

Better "inside polygon" check please!
It's broken when the line you're checking on is tangent to a line of the clip.

So another thought would be -- similar to the "clockwise" test, but /add/ the angle from the point to the first place we hit.

Ok [this](https://en.wikipedia.org/wiki/Point_in_polygon#Winding_number_algorithm) looks like a pretty tight solution?
hmmm does it also work with arcs? hmm I think so, yes.

orr I could do the "only include the one whose other vertex lies below" ... but with arcs, it's not that easy.

General thoughts?

yay it's working!










## [ ] Better colors!

- Ok, so the issue is: We're following the clip to the end, for some reason.
  and then coming back.

- pleeease give me a color picker, really anything I need it.

also, can i autogenerate palette colors?
like
hmm I don't super want to have to implement kmeans https://twitter.com/GalaxyKate/status/1462258231963791361/photo/3

so first, filter out anything with saturation < 0.5
and anything too light or too dark

then, we just have hues

so first, I'll normalize all saturations
and then bin hues

so, kmeans is interesting. but maybe not the ticket? idk.

ok, have a button that is "pick the top x colors for me"


ok, also, I want to be able to edit a palette with the image in front of me? Like select a whole palette from an image.






## [x] CLIP BUGS

- [ ] if we inset too far, it turns inside out. I tried running an `isClockwise` test, and it lied.
- [x] it looks like backtracking directly breaks.
- [ ] re-entrant clipping doesn't work either, where we have a clip that ends up cutting something in two.
	at the moment, you just aren't allowed.

- [x] pure circle clip, has some bugs.
- [x] extent!
	- [x] ok this is getting a little weird though. I'm not deduping segments correctly.
	- [x] hmm not just verticals. if there are two guides, I'm not deduping the paths.
		- probably because I assumed that you couldn't have two guides in the same spot.
- [x] all visible paths have intersections at points, and guides.
	- [x] FIRST step is to simplify all paths tyvm
	- [x] oh wait not guides actually, just "next segments" would be enough I think?
	- [x] need to honor limits on circle primitives

- [x] lighten/darken palette colors!
	- maybe want to muck with saturation as well?
	- [x] PREVIEWWWWW PLEASE

- [ ] 'm' should toggle the current mirror. I think. And maybe a key to rotate through them? idk.
	- maybe shift-m rotates through them. when changing the mirror status, I should briefly show the mirror
		dealio, dontchaknow.

Basic Plan:

- [x] NEED to dedup mirrored paths. Nobody likes having multiple paths in the same place. It's just bad.

- better coloring
	- try not having a tab ... for paths or groups ... just selections, and a style dialog.
- multi-select (not sure how to do this well with groups)
	- ok, so First click = group,
- guides are mirror-independent
- have a selection of paths, and say "duplicate these around


Better path creation
- Ok, I think I like this! the arrow keys are making sense to me, and I think it'll make for a great mobile experience.
- now I need to make little arrows, to make it clearer what's happening.


- [x] setup temprary zoom. when you go to export, I clear it out, folks.
	- [x] scroll
	- [ ] pinch to zoom pleeeease
- [ ] mobileeeeeee frieeendly
	- DrawPath should show a virtual "keyboard" for up/down/left/right, as well as "cancel"

- [x] pending guides should show the mirror versions folks
- [x] add in all points for all visible paths. maybe all line segments, if they're not covered? like that would be really good.
- [x] might be nice to be able to re-define the "bounds" for a line, if you want to keep things tidy.

- [x] for palettes, it would be nice to be able to paste in a 4- or 5-color one, and have it produce "1 shade lighter / darker", right?
		- or even better(?), just have a fill option that is darken/lighten? idk


- [x] so, I guess I've got image fills now! Which is very cool
- [x] also, made my own canvas renderer, because svg->canvas was buggy 🤷‍♂️. 

- [x] get colors from an overlay!! maybe I should do an average? At any rate, I reeally want to be rendering more fancily...

- [x] background from palette pleeeease

## [x] INTERSECTONS FOR ALL PATHS, if they don't already exist. AND SEGMENTS FOR ALL PATHS

## [x] MULTI FILL

## [x] INSET, gotta have it.

- [x] all paths should be auto-simplified.

- [ ] OK, so once we do `borders`, then we can have a flag for `don't inset from the border`. Which would make it
	make more sense to have only a couple things inset, and the rest not.
- [ ] it would be nice to have the option to "dedup outlines ... so we only get one"

- [ ] FIX MULTIFILL/merge - first, allow me to "remove the custom", but also allow me to just nix the custom color, or inset, or whatever.

## [ ] CLIP PLease, would be very nice. How to define? 
	- I could just use normal DrawPath ... would that make clipping very complex? I would definitely want to do path simpliciation yes very much.

- [x] SOOO waht about having the default "extent" for lines be something like 2x or 3x? And then have a toggle for "go forever"?
	- because ... it would make things much cleaner, and more localized ... which is often what you want. But only 1x is often a little short.


- [x] visuallll display of mirrors! Like draw me a picture, thank you.

- [ ] have a fill setting that is "randomize darker/lighter pleaseeee"

- [ ] make it easy/clear how to remove specific styling for a path. "unset"

- [ ] would be verry nice to be able to regroup paths.

- [ ] make coloring make more sense folks.
	- a hover dealio would be very nice
	- also collapsing sidebar things probably


- make path generation make more sense.
	Have "click" be the default mode, with mousehover just for superusers.




THe most FUN:

## It would be super cool
to generate a pseudo-timelapse of creating one of the designs.
given that I have the full history, it should be doable?
like for starters, I could just advance the UNDO and snapshot 🤔

or just, have screenrecord going, and make a "demo mode".
Yeah that could be fun.

Make a little animated cursor that goes around, doind the things...


UP NEXT:

- [x] delete a path my folks
- [x] when making a path, hide intersections.
- [x] disabled guides should still show up, but faint
- [ ] create mirrors! be able to define them.
- [ ] maybe have a way to re-jigger a path around a new mirror?
- [x] make a background to indicate transparency
- [ ] definitely do the "palette for line widths" thing.
- [x] ORDERING pleasseee

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