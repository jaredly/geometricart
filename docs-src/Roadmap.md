
ok, now I really need to do the hover-token instead of just hover-whatever


So, to allow function-specific visualizations,
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

