#!/bin/bash

# Test Coverage Report Script
# Generates comprehensive test coverage reports with visual output

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_DIR="coverage"
COVERAGE_THRESHOLD=80
CRITICAL_THRESHOLD=90

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}            Gloria Backend - Test Coverage Report              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Clean previous coverage
echo -e "${YELLOW}→ Cleaning previous coverage reports...${NC}"
rm -rf $COVERAGE_DIR

# Run tests with coverage
echo -e "${YELLOW}→ Running tests with coverage...${NC}"
npm run test:cov

# Check if coverage was generated
if [ ! -d "$COVERAGE_DIR" ]; then
    echo -e "${RED}✗ Coverage directory not found. Tests may have failed.${NC}"
    exit 1
fi

# Parse coverage summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                       Coverage Summary                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Extract coverage percentages from JSON
if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
    STATEMENTS=$(node -e "const c=require('./$COVERAGE_DIR/coverage-summary.json'); console.log(c.total.statements.pct)")
    BRANCHES=$(node -e "const c=require('./$COVERAGE_DIR/coverage-summary.json'); console.log(c.total.branches.pct)")
    FUNCTIONS=$(node -e "const c=require('./$COVERAGE_DIR/coverage-summary.json'); console.log(c.total.functions.pct)")
    LINES=$(node -e "const c=require('./$COVERAGE_DIR/coverage-summary.json'); console.log(c.total.lines.pct)")

    # Function to display coverage with color coding
    display_coverage() {
        local label=$1
        local value=$2
        local color=$GREEN

        if (( $(echo "$value < $COVERAGE_THRESHOLD" | bc -l) )); then
            color=$RED
        elif (( $(echo "$value < $CRITICAL_THRESHOLD" | bc -l) )); then
            color=$YELLOW
        fi

        printf "${color}%-15s: %6.2f%%${NC}\n" "$label" "$value"
    }

    echo ""
    display_coverage "Statements" "$STATEMENTS"
    display_coverage "Branches" "$BRANCHES"
    display_coverage "Functions" "$FUNCTIONS"
    display_coverage "Lines" "$LINES"
    echo ""

    # Check if coverage meets threshold
    FAILED=false
    if (( $(echo "$STATEMENTS < $COVERAGE_THRESHOLD" | bc -l) )); then
        echo -e "${RED}✗ Statements coverage below threshold ($COVERAGE_THRESHOLD%)${NC}"
        FAILED=true
    fi
    if (( $(echo "$BRANCHES < $COVERAGE_THRESHOLD" | bc -l) )); then
        echo -e "${RED}✗ Branches coverage below threshold ($COVERAGE_THRESHOLD%)${NC}"
        FAILED=true
    fi
    if (( $(echo "$FUNCTIONS < $COVERAGE_THRESHOLD" | bc -l) )); then
        echo -e "${RED}✗ Functions coverage below threshold ($COVERAGE_THRESHOLD%)${NC}"
        FAILED=true
    fi
    if (( $(echo "$LINES < $COVERAGE_THRESHOLD" | bc -l) )); then
        echo -e "${RED}✗ Lines coverage below threshold ($COVERAGE_THRESHOLD%)${NC}"
        FAILED=true
    fi

    if [ "$FAILED" = true ]; then
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}           Coverage threshold not met. Build failed.           ${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ All coverage thresholds met!${NC}"
    fi
fi

# Generate coverage badge (if badge-gen is installed)
if command -v badge-gen &> /dev/null; then
    echo ""
    echo -e "${YELLOW}→ Generating coverage badge...${NC}"
    badge-gen -d ./$COVERAGE_DIR -o ./$COVERAGE_DIR/badge.svg
    echo -e "${GREEN}✓ Coverage badge generated at $COVERAGE_DIR/badge.svg${NC}"
fi

# Display uncovered files
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      Uncovered Files                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Find files with low coverage
node -e "
const summary = require('./$COVERAGE_DIR/coverage-summary.json');
const files = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .filter(([_, data]) => data.lines.pct < $COVERAGE_THRESHOLD)
    .sort((a, b) => a[1].lines.pct - b[1].lines.pct);

if (files.length === 0) {
    console.log('✓ No files below coverage threshold');
} else {
    files.forEach(([file, data]) => {
        const path = file.replace(process.cwd() + '/', '');
        console.log(\`  \${data.lines.pct.toFixed(2).padStart(6)}% - \${path}\`);
    });
}
"

# Open HTML report
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Coverage report generated successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}→ HTML Report: file://$(pwd)/$COVERAGE_DIR/index.html${NC}"

# Ask if user wants to open the report
read -p "$(echo -e ${YELLOW}Open HTML report in browser? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$COVERAGE_DIR/index.html"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$COVERAGE_DIR/index.html"
    else
        echo -e "${YELLOW}Please open $COVERAGE_DIR/index.html manually${NC}"
    fi
fi