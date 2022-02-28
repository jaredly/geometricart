https://twitter.com/DannyDeraney/status/1497709732336791558
- [x] change "expected" to "output" everywhere, and have a yamlish header indicating whether this output is valid or invalid. TODO should I allow non-utf8 serializations? like, as a png?

- [ ] hmm the .input.txt file should have the nice readable title as the first line. and any notes.
	- also at this point, do I need separate files?
	- I guess if they're going to be images at any point, I will.
	- but then I'll need a separate file for the metadata anyway.
	- so yeah, maybe let's just do one file per fixture now?

- [ ] I kinda want to be able to configure the editor .. for certain fixtures. Like, configure the grid size. Is that weird? am I going to regret this? like, putting in the metadata for the fixture, also the info about what is going skinny? ok but really do I care about custom serializers? I pretty much don't right now. oh but I could use a variable line-break, that's indicated by being the line break after the metadata, which I control.

- [ ] HMMMM ok, so maybe I'm thinking we actually want to
	just have a single file with all the fixtures in it?
	I think that's what jest snapshots do, and there's some
	value to it.

And then we'll be alright?
One question in my mind is: How do you migrate tests,
when the types of things change?
Do you just backport the values to the old tests?
Or write a new .vest.?

ALSO should we allow multiple registrations in a single
.vest. file?
Seems like you oughta.
But maybe it's just "pass in multiple configs to the register fn" and we'll deal with it?



It does seem like having some linters / validators could be useful to.
automated ways to flag things.
in the react element context, these could be accessibility, etc.