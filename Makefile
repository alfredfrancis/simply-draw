build:
	npm install
	npm run build

deploy-ghpage:
	git checkout --orphan ghpage
	cp -a dist/* .
	git add assets/.*
	git add index.html
	git commit -m "Deploy to GitHub Pages"
	git push -f origin ghpage
	git checkout -

deploy: build deploy-ghpage

.PHONY: build deploy-ghpage deploy
