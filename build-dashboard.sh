#!/bin/bash

echo "Creating folder structure..."

mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/pages
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/data

echo "Writing Tailwind config..."

cat > tailwind.config.js << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
}
EOF

echo "Writing index.css..."

cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-800;
}
EOF

echo "Basic structure ready."
echo "Next step: I will now provide the full enterprise UI files."

