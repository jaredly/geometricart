

So, how do I deal with 'show' vs 'hover'?
Like,
should I have it where you can click anything,
and have it open in the line below?

I like the idea of being able to pre-indicate that
some things might be nice to examine together...


OH NOESSSS

oooh ok very cool, typescript delivering up the type goodness.

ok some weirdness with positinings, it appears (AHH ok getLeadingTriviaWidth fixes.)
we're including leading whitespace? very strange.
idk
but, we're gettng pretty-printed types for things.
which, at the very least, I can print out for folks

- [ ] dump the block of types into `thefn.types`
- [ ] render it out folks, and show it in the tooltip
  and then we can do things like render the tooltip value
  based on specific types.

  I'd really like for function call bodies, if they're called multiple times,
  to have ... some kind of trace ...
  so, rendered below if you want, is a carousel of the params
  from the different invocations.
  and you click on one, and it loads up that invocation,
  so all hovers and stuff correspond to that one.

  hmm
  but a more explicit, and less tricky thing, would be to
  add a special `// @trace(someexpr)`, which will trace
  the thing. and then we remember that, on that spot, we
  want to be rendering the stuff out.



a.forEach(() => {}) is falling afoul!
maybe I can just ignore .forEach for now.
lol ok I do need a more robust solution though.

- [x] render arc segmentintersections
- [x] render the outputs
- [x] figure out if it works!
- [ ] figure out how to convert the new output to the old output.



Hmmmm should I try to integrate the typescript checker?
So that I can get type information of various places?
Or is it enough to do duck-typed visual plugins?
tbh that's fine for now.



ok wht what

so at what point do I do the magic?
it would be nice not to have to
ts-ignore the import.
I mean,
I guess I could hmmm just
import the function,
and have the traced version have attributes.
tbh that's probably the best method.
ok I'll do that.



ok, why am I trying to load fixtures directly

because in the other setup, I am. and ... um ... maybe it's fine the
way it is?





auto-tracing of the function in question would be nice.

hmm maybe the register can just add something to the page? like it's fine.

and the menu is a separate react root entirely.
uh maybe. or just, lazily loaded? defends against double-loading.
yeah. gotta be the same bundle to avoid doing confusing things.

ok, but back to the question of how
we
do things right here
like
`register`, when we do that ... how do we do a magic
oh can we say `.trace.tsx`? And then it just goes ahead and
traces all the functions in there? yeah maybe that's good.




- [ ] go through lineLine and arcArc and clean up variable names, docstrings, etc.
- [x] in the mini fixtures, line widths should be much bigger. Add a 'line zoom' variable to the render.
- [ ] allow editing of fixtures (save back to source), so I can clean them up.
  should be pretty simple? stand up a basic server

- [ ] can I merge in my vest thing? like. .. I really like the idea.
  I guess I don't really need mdx at this point? funny.
  - [ ] ok so there will be a mode that has editing, and a mode that's
    just for public documentation. Some flag or something.
    

- [ ] ooh can I make this system work for the babel transform source? hmmm




Ok I should also write a whole blog post about the features of this system,
and things that are cool.
- [x] @list-examples for coverage checking ;)



- [ ] hmmmm I should really hook up the server to this, so that I can do editing
  of fixtures directly in this UI. Because why not? right? when I come across
  failing examples, I should be able to save them, so that they won't fail
  in the future!



- [x] let's just junk all the imports. nobody needs them.
- [ ] also let's support a docstring on the main function, same dealio.
  - [ ] also comments on the args, let's gooo

- [ ] need to differentiate between "hover" for the tooltip and "hover" for showing up in the preview.
  yeah definitely.
  - [ ] And hover in the preview should count for children too.

- [x] hmm ok so what about getting docstrings for my functions? Seems doable, right?
- [x] click a thing to "pin" it in the preview window
- [x] inline docstrings so gooood
- [ ] can I get `references` to variables in the docstring to resolve, such that
  my inline widgets happen there too? That would be so rad.
- [ ] also, having an end-of-line comment on a variable declaration, indicating
  what widget I want to use to render the thing (so that I can annotate the
  angle variables?)


I want to keep info about a variable through it's uses, so I can e.g. show an angle
arrow in the places it's used. Seems like it ought to be doable.

I'm assuming immutability, which, might be fraught idk.
I guess I can always keep both if I want?
we'll see.



- [x] ok, now I really need to do the hover-token instead of just hover-whatever


- [x] So, to allow function-specific visualizations,
  I want a processor that annotates exported functions, with
  .meta = {name, filePath}










ok, so I'm actually thinking about:
- showing the code on the side
- mouseover `angleTo` and it draws the appropriate stuff on the screen
    - so having like an annotation on `angleTo` that knows how to draw
      something useful from the args + return value

so, I don't actually need to step?
I'm just tracing? I think?
yeah, it'll still require a transform.


so something like
const to = angleTo(prev, seg.to)
becomes something like
let _v1 = trace(prev, 1)
let _v2 = trace(seg, 2)
let _v3 = trace(_v2.to, 3)
let _v4 = trace(angleTo, 4)
// This is a fn call, so you get the return value, the fn, and the args
// if the fn has a `.visualize`, call that instead of the default debugger
let _v5 = trace(angleTo(_v1, _v3), _v4, [_v1, _v3])
const t0 = _v5

