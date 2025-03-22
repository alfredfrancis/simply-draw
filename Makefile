build:
	npm install
	npm run build

deploy-ghpage:
	git show-ref --verify --quiet refs/heads/ghpage || git checkout --orphan ghpage || git checkout ghpage
	cp -a dist/* .
	git add assets/.*
	git add index.html
	git commit -m "Deploy to GitHub Pages"
	git push -f origin ghpage
	git checkout main

deploy: build deploy-ghpage

.PHONY: build deploy-ghpage deploy
