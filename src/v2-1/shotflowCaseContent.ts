// Native captures for the current ShotFlow case. The shared catalog remains the legacy source.
export const shotFlowCaseScreens = [
  {
    "image": "/portfolio/shotflow-walkthrough-v1/workspace-1290.webp",
    "alt": "ShotFlow project workspace with six shots and two completed.",
    "caption": "A shared workspace for the sample shoot: two source videos, six shots and two completed."
  },
  {
    "image": "/portfolio/shotflow-walkthrough-v1/analysis-1290.webp",
    "alt": "ShotFlow analysis queue for the two sample reference videos.",
    "caption": "Source videos keep their own analysis state within the project. Sample data."
  },
  {
    "image": "/portfolio/shotflow-walkthrough-v1/storyboard-overview-1290.webp",
    "alt": "ShotFlow native storyboard with shots grouped by source video.",
    "caption": "Source groups preserve the context of each reference; shooting order serves the plan."
  },
  {
    "image": "/portfolio/shotflow-walkthrough-v1/player-1290.webp",
    "alt": "ShotFlow native reference player with a playable sample video.",
    "caption": "Review the timing and movement of an individual reference clip."
  },
  {
    "image": "/portfolio/shotflow-walkthrough-v1/trim-before-1290.webp",
    "alt": "ShotFlow native manual editor showing the range of a sample shot.",
    "caption": "Adjust the selected range while keeping the original source video."
  },
  {
    "image": "/portfolio/shotflow-walkthrough-v1/field-1290.webp",
    "alt": "ShotFlow native professional-camera guidance for the current shot.",
    "caption": "Keep the reference and the next action beside the professional camera."
  }
].map(study => ({ ...study, width: 1290, height: 2796 }));

export const shotFlowCaseCover = {
  image: shotFlowCaseScreens[0].image,
  imageSmall: '/portfolio/shotflow-walkthrough-v1/workspace-800.webp',
  imageAlt: shotFlowCaseScreens[0].alt,
  imageWidth: 1290,
  imageHeight: 2796,
};
