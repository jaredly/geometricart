
GET READy for untangleHit that can handle all the things
at least all even-numbered things.

So

- [x] make a deepEqual that is nicer to floats
	- hm maybe I didn't need that? idk.
- [ ] make a new impl of untangleHit, use it in the vest
- [ ] iterate till it works
- [ ] make some tests for >4 items.



# Hmmm what about visual debug statements?

Like,
actually in the implementation
have console.log but it's visual.log
and you give it SVG whatsits
but it's behind a __dev__ or whatever
so it'll be compiled out in non-debug?
might have to do a fancy compiler pass
to remove them? idk.


hmmm actually even fancier is just trace everything?
so, maybe it's like
do a transform that also exports a `insetLineLineTraced` function?

(but would that do tracing of inner functions? no it wouldn't really
but maybe thats fine.)

And then I can call that in my mdx dealio?

yeah, but then
we'd keep track of like the parse locations
that we're tracing for
and then
when I render out the stuff, include parse locations
in the generated html nodes.


ok prism-react-renderer looks like the right call

so, I want to do a ... babel transform ... as part of the esbuild, I think?



# hmmm

- [ ] ooh should I do "join shapes" now? could be fun. I think I can just do the clipping alg but only keep the outside shapes.

CAN I REUSE the clip stuff for the inset stuff?

I THINK SO!
And it looks like it's faster, which is rad.

ok, done with that.


## BEZIERS?

The big question mark is offsetting:
- https://microbians.com/math/Gabriel_Suchowolski_Quadratic_bezier_offsetting_with_selective_subdivision.pdf
- https://web.archive.org/web/20061202151511/http://www.fho-emden.de/~hoffmann/bezier18122002.pdf

There's also intersecting, but I think that's more of a solved problem.

# Main Gaps in the Clips Stuffs

OK FOUND ANOTHER ONE
yall
really stress testing here
when I could have just unit tested
but here we are

- [x] ahahhaaa yayyy ok fixed that one too!
	- and now I have those visual tests, gotta love em.

I want a visual unit test suite for my windingNumber dealio.
Which means I think it's time to formalize a visual testing framework
my folks

do we need to give test cases IDs? Yeah, that would be great.
slugify the name, it's great.

then we have `the-slug.input.json` and `the-slug.expected.json`.



- [x] track down the source of BAD PREV. Why are we ending up at not the right place?
- [x] soooo clooooose I think??? 
	Yeah not handling single-circles well.
- [x] non-intersecting (easy to detect, and then do an is-inside check for any of the points of the shape)
- [x] arcs with the same tangent as a line (see test case)
- [x] welp, found another bug (it was my lazy method of seeing if any actual collisions happened)
- [ ] (low priority) self-intersecting shapes, so that you can have more than 4 participants in a setup.

Lol ok lots more bugs it looks like
no idea why all these shapes think they're inside the lines.
- [ ] oh wait maybe all these things are not clockwise? and maybe not simplified? idk

AND THEN

SO the problem is:
- [x] we're throwing away the info that we have about inside/outside, when getting into the situation.
	Ok that's fixed.



we can start using it.

AND THEN

- [x] let's do the "path hash", so we only calculate insets for one thing at a time, pleeeeease



Clips, with arcs!

Ok, I've found some smallish breaking cases.
yayyy ok arcs work!

--

Ok, filtering outside stuff is working pretty well!!!

Definitely need line-over-line fix.


hmmm IF there's a toss-up, bias towrd keeping same-shapes together? maybe??

hmmm no. More like, if you've been inside, stay inside. if you've been outside, stay outside.
otherwise it won't matter? I think??/

yeah, so I need to be able to return a hitPair result that is "ambiguous", either one inside, one unknown, or one outside, one unknown.

---

CLIP ME UP SCOTTY

yes, wonderful progress!!

now, to filter out the things we don't want, we'll need to:

- keep track of the entries that segments came from? I think
- examine hit entries, to determine which /exits/ should be excluded
- then find regions with excluded exits, and drop them!

And THEN I need to thoroughly test out the arc handling, because it might be bogus.

Super stoked, my folks. Gonna be rock solid.

Also maybe I can use this for insets, we'll see. And weaving.


BE SURE to test lines that are overlapping, my folks.
yeah not doing well


ALSO not doing well is the corner thats on another line. wows.
- ok fixed that, nice.
- but now the lines overlapping is breaking, so gotta figure that out.





# Next up:

BUG FIX:
- replace checkContained's use of insidePath with windingNumber. Pleeeease.

NEXT UP
let's get variables to scripts going
and have lerps be just one part of that.
AND get the library saving to / from working,
so I can re-use all these lovely scripts.

- ok, so insets are probably in quite good shape.
- clips are in rather worse shape. I should change it to use the inset algorithm.
	- basic idea: for boolean AND, both go clockwise.
	- for boolean NOT, the negative one goes backwards.
	- for boolean AND, I think you just 'accept all regions'? And then you have to join them, I guess?
	- oh wait, not it's not quite that simple. because we want ... hmm I guess you could do "split into regions, and then do the winding test"? But the winding test has been a little fritzy.
	- that might be the best I've got though, without introducing more complexity to the region-finding.
		like, segments have colors?

		Anyway, I should probably make a test page for clips, tbh. and in the little editor, make it snap to
		grid points, so I can have some colocated corners to test those edge cases.
		Yeah I think as far as robustness goes, that's the next step. Get clipping working really well.

		ohhh hmm so what if, after getting all segments going, I just "delete" all clip segments that are obivously "going outside" of the path? Then I can run the normal regions algorithm and it should work fine, starting from any clip segments that remain?

# Newfangled Scripts

Need a way to specify configurables.
What kinds of things?
- floats (min/max, step?)
- ints (min/max, step?)
- boolean
honestly that gets you so far
- colors, sure
- positions! oh definitely
	ugh do I just go whole hog on FBP or not
- selections, gotta have it
- lerps, oh yeah that makes sense!

default values? Yeah sure.


Soooo all scripts have a lerp parameter that's like "how should we modulate t", right?


Ok, so: you write out the function, you add variables.
Those variables get parsed out, and you can then configure them.


- [x] basic timeline editor
	- [x] add slots
	- [x] edito slots
	- [x] better editing, below, so small slots arent squished.
	- [ ] custom variables for scripts pleeease
- [ ] Library! Yes very much want it.
	- [ ] "save to library"
	- [ ] "revert to library version"
	- [ ] "load new from library"

# [x] AddRemoveEdit action type

Could simplify things a lot.
Now the critical questoin: Can I do a subset?

# Let's talk about the timeline.

Want a "script library", similar to the palette library I guess, but better concieved.
So you can copy between them, basically.

Want to be able to export/import as well.

Things that the library contains:
- scripts (with a readable id) - scripts can reference a lerp explicitly, could be fun
- lerps, sure thing.

So yeah, I can do that first.

And then I can do timelines.

hmmmmmm I wonder if I need ... the ability to group actions into a single undo-group. That sure would be nice for some of these things.

So the script editor will have a "save to library" button.
And at that point you give it an id? And if the script is saved to the library already,
it will ... indicate that.
Yeah when you give it an ID, it will rename things.

Also a "load from library".


# Gotta do a fade out!
At the end of a fading thing, to clear away paths.
or a sweep idk

simple, effective

# Layers?

Some of the animations I'm imagining involve having multiple different patterns that we transition between.
Maybe that would mean having multiple "layers"? Every path & group has a "layer" that it's associated with,
and you can only edit / interact with one layer at a time?
But then animations can do fun things with them.

# Annnimation Yahoo Pipes FBP??

like I think it would be a lot easier to reuse functionality, and such.
but I should probably do the animation planner first? idk.
yeah. And I can extract reusable things in to builtins.

# "Duplicate"
- [x] I want a simple "I have a selection, duplicate it by rotation 180º around this point.

# Animation Planner

- now with actual timelines.

	scripts still get 't', and they can also get 'T' which is the overall time, and 'idx' which is their index (maybe? could be weird).
	andddd it would also be nice to allow scripts to have config variables ...

- [ ] export animation config! Would be great to be able to export the scripts & vbls and such, to use in another project.

# Would be really cool to get step-by-step animations going.

# Fancier Animation Planning

- I want to be able to chain animation scripts, viually.
	- and scrub through, knowing where they start and stop
	- and drag to change duration
	- and enable/disable them, for funs
	- also, have multiple tracks, so animations might be running
		at the same time.


# Fun things to do with animation:

## "Burning" where I trace each thing with a yellow dot? With fade out in the back?

## 3d with blocks that have different shapes depending on orientation
Constructed using https://evanw.github.io/csg.js/ ?
Would also need https://threejs.org/docs/#api/en/cameras/OrthographicCamera probably

## Demonstrate how to build up a pattern!

## Morph??
Yeah that could be a really cool effect. Demonstrating different shapes that are within the same basic pattern.

## Gradually build up, in a certain order
Could be quite cool to be able to run a script to prepare things,
and then have the cache be populated on subsequent runs. I guess
I could just pass in a cache variable? yeah that sounds reasonable.
Would maybe want a button to clear the cache or something?




- [ ] to stabilize colorVariation, tick the rng even if the thing doesn't end up
			being displayed. Also, let's have uniform coloring for all bits of the inset.
- [ ] can I use my fancy new algorithm to figure out clipping more robustly? seems like
			I ought to be able to.


Ok, so I've added a bunch of debugging to this weird path behavior.



BUG
SO I think findRegions iswrong?
and I think the coordKey dealio is the reason.

I thiiink that my "split into segments" ought to be able to produce
a correct mapping of "here are the shared coordinates", right?
because like I just did the intersections of all the things.

hmmmm maybe Froms is already wrong? hmmm


should I try to do a whole new method of "split into segments"?
Like could I do segments and regions at the same time? idk.
.... I guess that's what I was doing before. Maybe it'd be more robust???



Sooo
to speed things up quite a bit
lets do "each path has a hash of the first-point-aligned segments list
which is the segments with the first point at zero, and the second point along the x axis.
Then we can do all our inset/outset etc of that prototype, and then just rotate it
accordingly. I think this would be much faster.
would be good to do it in a way that ensures that though.
the quick & dirty method would be to compute the hashes on the fly
although they could be indefinitely cached.




AOKKK now we're up to animations. Love it so much.

Oh but first, can has some optimization? idk.

- [x] yayyy animations!
- [ ] when animations are enabled, disable like everything else in the name of performance.
	- so no interactivity, basically.
- [ ] um also maybe render to canvas in that case?
- [ ] also I still need to do moreeee optimizations, not sure where.






ARCCSSS

hmm so the thing that actually makes sense is to extend the border around the now-corner.
hmm. and extend it around by the inset amount.
that sounds quite reasonable.

we could square off the ends, or round them off I guess.
could be up to a user toggle.

Ok, so inset is now correct between two arcs. It's possible that
the arc/line and line/arc stuff is still faked, and I need to do the same
thing I did with the arc/arc. But I think it might also be fine.

The big deal now is getting performance back to a good place.
probably by aggressively caching.


# Ok, insetting is basically done? I mean arcs aren't quite right.

Question:
is it higher priority to make mobile work reasonably, or to do animation stuff?
I can tell you animation is more exciting.
but I'm soooo close to mobile being good.

# So
what things do I still have to shell out for?
- palette stuff
- exports
Is that it?

- [x] zoooom for mobile
- [x] then make hit targets for mobile so big.
	- but less visible, ya know
- [x] make path follower much more better
- [x] fix pan perf
- [x] make pending mirror inherit from whatever the active mirror is.

- [x] hover to show guides! pleasssse
- [x] hover to show/hide overlay!
- [ ] clipssss need a menu for them, thanks.
	- also need to be able to configure clip behavior of groups
	- also button to 'group'

- I want to start doing some process ones.
- [ ] make a slider that you can open up to scrub through undo states.

- [x] overlay, actual menu (show/hide) (over/under) (delete) (add)

- [ ] hover colors to preview
- [x] import button in config menu
- [x] make mirrors show up better
- [x] fix mirror menu to have same size & button style as other things

- [ ] ooooh use https://www.npmjs.com/package/json-diff-ts to dramatically reduce the undoaction size! That sounds great.

- [x] when a line guide is selected, show plus / minus buttons to lengthen/shorten
	- [ ] make a button to "go infinite" which toggles to "go some kinda way"



- [ ] for making tiles, I think what I mostly want is "paint to fill". Like mouse over the sub-sections, and it makes the tile that includes them all.
	- this wouldn't work for some cases, but is probably the most user-friendly, so should be the default.
	- hmm although sometimes there are really little bitses. so it wouldn't be better ....


# Ok, so it would be suuuper cool to be able to automatically weave stuff.


# Undo Sidebar Tab???
- yeah I've wanted something like this for a minute
- [ ] make the display a little more interesting....
- [ ] holy grail: hover over an undo item, and show what it would look like to undo/redo to that point.


- [x] hide selection outline when hovering the style picker.
	- [x] maybe not have the style picker be up by default? Yeah I think that would make more sense.
	- [ ] hovering colors previews it, of course!

- make overlays usable
	- [ ] button to open file picker, so mobile works
	- [ ] make pinch-zoom work.

- [ ] reset zoom needs to go somewhere else?
- [ ] clips! Need to show on screen, next to mirrors and overlays
- [x] make the overlay display at all good please.


- [x] bake into the export a dpi dealio.
	- [x] persist in the state my folks.
	- [x] And when exporting the svg, indicate what the real size (in & mm) is of the
	full screen,
	- [x] and the bounding rect.
	- [x] also add the ability to say "crop to content, w/ X margin"

- [ ] add visual tests for inset, that produce an SVG for visual check.

- [x] deal with circles that don't meet up

## Mobile things that currently only have key shortcuts

- [x] undo/redo
- [x] deleting stuff (selected tiles, or guides probably)
- [x] guides dont multi-select, there's nothing to do there.
- [-] ooh should I have a way to say "multiply this guide around this mirror?"
	- I think maybe not?
	- hm it would be nice tho
		- if the guide doesn't have a mirror yet, it's easy
		- otherwise, we just duplicate, it's not grouped, boohoo.


## Ok let's try different sized screens
to prepare for mobile ya know

- [ ] get two-finger zoom to work, it probably doesn't.
- [x] when a tile is selected, show the multistyler please
- [x] have the "pos" for creating new guides be the center of the screen, with a cursor
- [ ] would be really nice to have a mode where you just drag to make a tile... instead of having to tap so much.
- [x] show a "mirrors" tap-up that allows you to create a new mirror, delete the current mirror, switch the active mirror.

- [x] MIRROR OVERLAY
	- [x] allow deletion of mirrors
	- [x] switch between mirrors
	- [ ] on-screen buttons for controlling pending mirror (change number, reflect, cancel)
	- [x] button for "copy select tiles around active mirror"


- FIRST RUN EXPERIENCE:
	- allow you to select the initial mirror, don't just use a default.


- [x] REIFY GUIDES. Got to make mirrors and such.
- [x] so what about a "cut paths to clip" button? So that you can then do like some tilings with them.
- [ ] "join adjacent tiles" would be very nice"

- [ ] ifff a line goes backwards after inset, just delete that segment and recalculate?

- [x] make a setting for "clip first, then inset" or "inset first, then clip".

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