#!/usr/bin/env bash

echo "📦 Installing Pre-Commit Risk Checker Git Hook..."

# Ensure we are in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Error: This script must be run from the root of a Git repository (where the .git folder is)."
  exit 1
fi

# Ensure pre-commit script exists
if [ ! -f "git-hook/pre-commit" ]; then
  echo "❌ Error: git-hook/pre-commit script not found."
  exit 1
fi

# Copy the hook
cp git-hook/pre-commit .git/hooks/pre-commit

# Make it executable (Mac/Linux/WSL)
chmod +x .git/hooks/pre-commit

echo "✅ Success! The risk checker hook has been installed."
echo "Every time you 'git commit', your code will be securely scanned locally before being pushed!"
