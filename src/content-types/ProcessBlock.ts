import { contentType } from "@/lib/content-type";

import { ICON_ENUM } from "@/lib/icons";

const iconProperty = (sortOrder: number, displayName: string) => ({
  type: "string" as const,
  displayName,
  format: "selectOne" as const,
  enum: ICON_ENUM,
  sortOrder,
});

export const ProcessBlockCT = contentType({
  key: "ProcessBlock",
  displayName: "Process",
  description:
    "Four-step process explainer — each step has an icon, title and description.",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading: {
      type: "string",
      displayName: "Heading",
      isLocalized: true,
      sortOrder: 5,
    },
    subheading: {
      type: "string",
      displayName: "Subheading",
      isLocalized: true,
      sortOrder: 6,
    },

    step1Title: {
      type: "string",
      displayName: "Step 1 — Title",
      isLocalized: true,
      sortOrder: 10,
    },
    step1Description: {
      type: "string",
      displayName: "Step 1 — Description",
      isLocalized: true,
      sortOrder: 11,
    },
    step1Icon: iconProperty(12, "Step 1 — Icon"),

    step2Title: {
      type: "string",
      displayName: "Step 2 — Title",
      isLocalized: true,
      sortOrder: 20,
    },
    step2Description: {
      type: "string",
      displayName: "Step 2 — Description",
      isLocalized: true,
      sortOrder: 21,
    },
    step2Icon: iconProperty(22, "Step 2 — Icon"),

    step3Title: {
      type: "string",
      displayName: "Step 3 — Title",
      isLocalized: true,
      sortOrder: 30,
    },
    step3Description: {
      type: "string",
      displayName: "Step 3 — Description",
      isLocalized: true,
      sortOrder: 31,
    },
    step3Icon: iconProperty(32, "Step 3 — Icon"),

    step4Title: {
      type: "string",
      displayName: "Step 4 — Title",
      isLocalized: true,
      sortOrder: 40,
    },
    step4Description: {
      type: "string",
      displayName: "Step 4 — Description",
      isLocalized: true,
      sortOrder: 41,
    },
    step4Icon: iconProperty(42, "Step 4 — Icon"),
  },
});
