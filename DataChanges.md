
Data changes to make:

- history annotations should be a map [id] instead of a list.
- shouldn't allow non-tagged unions to include non-primitives (other than nullable)
- remove timelines? idk or maybe make it so it uses chunk() under the hood?
- `alternating` should be renamed to `group`? or like `autoGroup` or someething.
- exports -> creations maybe
- make a bunch of undefinedable stuff non-undefindable, like PatternContents' sort
