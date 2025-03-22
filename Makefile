build:
	npm install
	npm run build

# Deploy to GitHub Pages
deploy-ghpage:
	# Create and switch to a new orphan branch (no history)
	git checkout --orphan ghpage
	# Remove all files from the working directory
	git rm -rf .
	# Copy the built files to the root
	cp -a dist/* .
	# Add all files
	git add .
	# Commit changes
	git commit -m "Deploy to GitHub Pages"
	# Force push to ghpage branch
	git push -f origin ghpage
	# Return to previous branch
	git checkout -

# Combined build and deploy
deploy: build deploy-ghpage

.PHONY: build deploy-ghpage deploy
