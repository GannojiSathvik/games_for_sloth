# Contributing to SlothGame

First off, thank you for considering contributing to SlothGame! It's people like you that make this tool such a great project.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our issues. If you don't see it, go ahead and create a new issue!

## Fork & create a branch

If this is something you think you can fix, then fork SlothGame and create a branch with a descriptive name.

## Get the test suite running

Make sure your changes don't break anything. Run the development server and test your changes locally.

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with SlothGame's master branch:

```bash
git remote add upstream git@github.com:GannojiSathvik/slothgame.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout 325-add-japanese-translations
git rebase master
git push --set-upstream origin 325-add-japanese-translations
```

Finally, go to GitHub and make a Pull Request.
