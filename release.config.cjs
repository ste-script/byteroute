/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits"
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits"
      }
    ],
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false
      }
    ],
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "node scripts/sync-workspace-versions.mjs ${nextRelease.version} && pnpm -w install --lockfile-only --ignore-scripts"
      }
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "docs/SPE-report.pdf",
            label: "SPE Report PDF"
          },
          {
            path: "docs/ASW-report.pdf",
            label: "ASW Report PDF"
          },
          {
            path: "docs/SPE-presentation.pdf",
            label: "SPE Presentation PDF"
          }
        ]
      }
    ],
    [
      "@semantic-release/git",
      {
        assets: [
          "CHANGELOG.md",
          "package.json",
          "apps/*/package.json",
          "packages/*/package.json",
          "pnpm-lock.yaml"
        ],
        message:
          "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}"
      }
    ]
  ]
};
