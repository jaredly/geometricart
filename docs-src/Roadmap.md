

- [ ] slim down lineline to just take the angles? mayb

- [ ] let's just junk all the imports. nobody needs them.
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

