
# Vest - the missing UI for jest snapshot tests

`v`isual t`est`s. or something. Keeps you warm when it's cold. Looks fashion.

Things we need for this to work:

- a config file
- a test file probably, per config file? Or just a toplevel test... maybe
- annnd a UI-ly config file, so we know how to render the stuffs.


Ok, steps for this runner file:

- find all .vest.ts



And for running tests?

What if we have `.vest.ts` be picked up by jest,
and have conditional
```
if (typeof jest !== 'undefined') {
	define(`This should work`, () => {
		registerVestTest(config)
	})
}
```
?

Or actually

we could just have `registerVestTest(config)` as part
of the shebang.


hmm instead of exporting a config,
maybe we just do
`vest.registerTest(config)`? Yeah, and if we're in jest land
then it does one thing
and otherwise it does another.