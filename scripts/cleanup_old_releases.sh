#!/bin/bash
# Cleanup script to remove all old v1.1.0+ releases and duplicate drafts

echo "🧹 Cleaning up old releases..."

# Delete all v1.1.0+ releases
for tag in \
  v1.1.0+1cb6bfb v1.1.0+b76176e v1.1.0+d311d01 v1.1.0+9492598 \
  v1.1.0+25d750e v1.1.0+360c8e9 v1.1.0+fa9f599 v1.1.0+d178ee0 \
  v1.1.0+b7ba0c4 v1.1.0+1e22252 v1.1.0+2321690 v1.1.0+0d928fa \
  v1.1.0+7e732e7 v1.1.0+9ac107b v1.1.0+18e50f8 v1.1.0+aeca36c \
  v1.1.0+56d94da v1.1.0+94d720e v1.1.0+4cb717c v1.1.0+4f5f655 \
  v1.1.0+970eb6b
do
  gh release delete "$tag" --yes --repo mikevillargr/redditpipe 2>/dev/null && echo "  Deleted $tag"
done

echo "✅ Cleanup complete!"
