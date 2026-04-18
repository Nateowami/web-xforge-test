#!/usr/bin/env python3
"""Compares two sets of Storybook screenshots and creates a ZIP of the differing ones.

Reads PNG files from two directories (one for the base commit, one for the branch commit),
compares them using MD5 hashes, and reports which stories changed, were added, or were removed.
Any screenshots that are byte-for-byte identical are discarded; only changed images are included
in the output ZIP so the artifact stays small.

Output ZIP layout:
  base/<story-id>.png    — screenshot from the base commit
  branch/<story-id>.png  — screenshot from the branch commit

Usage:
  python3 scripts/compare-storybook-screenshots.py <base-dir> <branch-dir> <output-zip>

Arguments:
  base-dir     Directory containing screenshots from the base/target branch
  branch-dir   Directory containing screenshots from the PR branch
  output-zip   Path where the ZIP artifact should be written (only created if there are differences)

Exit codes:
  0  Success (differences may or may not exist; check the log output)
  1  Error (wrong arguments, unreadable directories, etc.)
"""

import hashlib
import os
import sys
import zipfile


def file_hash(path: str) -> str:
    """Return the MD5 hex digest of the file at the given path."""
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    if len(sys.argv) != 4:
        print(f'Usage: {sys.argv[0]} <base-dir> <branch-dir> <output-zip>', file=sys.stderr)
        sys.exit(1)

    base_dir, branch_dir, output_zip = sys.argv[1], sys.argv[2], sys.argv[3]

    base_files: set[str] = {f for f in os.listdir(base_dir) if f.endswith('.png')}
    branch_files: set[str] = {f for f in os.listdir(branch_dir) if f.endswith('.png')}
    all_files: list[str] = sorted(base_files | branch_files)

    differing: list[str] = []
    only_in_base: list[str] = []
    only_in_branch: list[str] = []

    for filename in all_files:
        in_base = filename in base_files
        in_branch = filename in branch_files

        if in_base and in_branch:
            if file_hash(os.path.join(base_dir, filename)) != file_hash(os.path.join(branch_dir, filename)):
                differing.append(filename)
        elif in_base:
            only_in_base.append(filename)
        else:
            only_in_branch.append(filename)

    # Report results
    if only_in_base:
        print(f'\nStories removed or renamed ({len(only_in_base)}):')
        for f in only_in_base:
            print(f'  - {f[:-4]}')  # strip .png suffix for readability

    if only_in_branch:
        print(f'\nStories added or renamed ({len(only_in_branch)}):')
        for f in only_in_branch:
            print(f'  + {f[:-4]}')

    if differing:
        print(f'\nStories with visual differences ({len(differing)}):')
        for f in differing:
            print(f'  ~ {f[:-4]}')

    changed: list[str] = sorted(set(differing + only_in_base + only_in_branch))
    total_identical = len(all_files) - len(changed)

    print(f'\nSummary:')
    print(f'  Base screenshots:   {len(base_files)}')
    print(f'  Branch screenshots: {len(branch_files)}')
    print(f'  Identical:          {total_identical}')
    print(f'  Different:          {len(differing)}')
    print(f'  Only in base:       {len(only_in_base)}')
    print(f'  Only in branch:     {len(only_in_branch)}')

    if not changed:
        print('\nNo visual differences found. No ZIP file created.')
        return

    # Create a ZIP containing only the changed screenshots, organised into base/ and branch/ folders.
    output_dir = os.path.dirname(os.path.abspath(output_zip))
    os.makedirs(output_dir, exist_ok=True)

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename in changed:
            base_path = os.path.join(base_dir, filename)
            branch_path = os.path.join(branch_dir, filename)
            if os.path.exists(base_path):
                zf.write(base_path, f'base/{filename}')
            if os.path.exists(branch_path):
                zf.write(branch_path, f'branch/{filename}')

    pair_count = len(differing)
    single_count = len(only_in_base) + len(only_in_branch)
    print(f'\nZIP artifact created: {output_zip}')
    print(f'  {pair_count} changed stories (both base and branch screenshots included)')
    print(f'  {single_count} stories present in only one commit')


if __name__ == '__main__':
    main()
