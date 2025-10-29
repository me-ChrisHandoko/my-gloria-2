#!/bin/bash

# Permission System Cleanup Script
# This script removes over-engineered permission controllers and models
# Author: Claude Code Analysis
# Date: 2025-01-29

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Permission System Cleanup Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Verify we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "src/modules/permissions" ]; then
    echo -e "${RED}Error: Must be run from backend directory${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/8] Pre-flight checks...${NC}"

# Step 2: Create backup timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
echo "Backup timestamp: $BACKUP_DATE"

# Step 3: Check if files exist
echo -e "${YELLOW}[2/8] Checking files to be removed...${NC}"

FILES_TO_REMOVE=(
    "src/modules/permissions/controllers/permission-template.controller.ts"
    "src/modules/permissions/services/permission-template.service.ts"
    "src/modules/permissions/dto/permission-template.dto.ts"
    "src/modules/permissions/controllers/permission-dependency.controller.ts"
    "src/modules/permissions/services/permission-dependency.service.ts"
    "src/modules/permissions/dto/permission-dependency.dto.ts"
)

MISSING_FILES=()
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    else
        echo "✓ Found: $file"
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}Warning: Some files not found (may have been deleted already):${NC}"
    printf '%s\n' "${MISSING_FILES[@]}"
fi

# Step 4: Backup files before deletion
echo -e "${YELLOW}[3/8] Creating backup of files to be removed...${NC}"
BACKUP_DIR="backup_cleanup_$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        cp --parents "$file" "$BACKUP_DIR/" 2>/dev/null || \
        rsync -R "$file" "$BACKUP_DIR/" # macOS fallback
        echo "✓ Backed up: $file"
    fi
done

echo -e "${GREEN}Backup created in: $BACKUP_DIR${NC}"

# Step 5: Remove controller files
echo -e "${YELLOW}[4/8] Removing deprecated controllers...${NC}"

rm -f "src/modules/permissions/controllers/permission-template.controller.ts"
echo "✓ Removed: permission-template.controller.ts"

rm -f "src/modules/permissions/controllers/permission-dependency.controller.ts"
echo "✓ Removed: permission-dependency.controller.ts"

# Step 6: Remove service files
echo -e "${YELLOW}[5/8] Removing deprecated services...${NC}"

rm -f "src/modules/permissions/services/permission-template.service.ts"
echo "✓ Removed: permission-template.service.ts"

rm -f "src/modules/permissions/services/permission-dependency.service.ts"
echo "✓ Removed: permission-dependency.service.ts"

# Step 7: Remove DTO files
echo -e "${YELLOW}[6/8] Removing deprecated DTOs...${NC}"

rm -f "src/modules/permissions/dto/permission-template.dto.ts"
echo "✓ Removed: permission-template.dto.ts"

rm -f "src/modules/permissions/dto/permission-dependency.dto.ts"
echo "✓ Removed: permission-dependency.dto.ts"

# Step 8: Verify TypeScript compilation
echo -e "${YELLOW}[7/8] Verifying TypeScript compilation...${NC}"

if npm run build 2>&1 | tee build_output.log; then
    echo -e "${GREEN}✓ Build succeeded${NC}"
    rm build_output.log
else
    echo -e "${RED}✗ Build failed!${NC}"
    echo -e "${YELLOW}Check build_output.log for details${NC}"
    echo -e "${YELLOW}You may need to update permissions.module.ts manually${NC}"
    echo -e "${YELLOW}Backup available in: $BACKUP_DIR${NC}"
    exit 1
fi

# Step 9: Summary
echo -e "${YELLOW}[8/8] Cleanup Summary${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Files removed:"
printf '  ✓ %s\n' "${FILES_TO_REMOVE[@]}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update permissions.module.ts to remove imports"
echo "2. Update schema.prisma to remove deprecated models"
echo "3. Run: npx prisma migrate dev --name remove_over_engineered_features"
echo "4. Run: npm run test"
echo ""
echo -e "${GREEN}Backup location: $BACKUP_DIR${NC}"
echo ""
echo -e "${YELLOW}To rollback this cleanup:${NC}"
echo "  cp -r $BACKUP_DIR/src/* src/"
echo ""
