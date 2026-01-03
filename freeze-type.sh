set -ex
rm -rf temp
pnpm tsc -p tsconfig.types.json
pnpm api-extractor run --local
mv temp/frozen/* src/routes/screens/pattern.screen/
rm -rf temp
