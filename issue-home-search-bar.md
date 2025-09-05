# Home search bar

Just a searchbar in the homepage that lists all blogs that either start or contain the search string (case insensitive)

Searchbar waits for enter

Shows two sections: "starts with" and "contains"

## Implementation Details - Index-based Approach

### Index File Structure
- Location: `blogs/index.json` in R2
- Format:
```json
{
  "articles": [
    {
      "slug": "cloudy-driven-email-security-summaries",
      "title": "Cloudy Summarizations of Email Detections: Beta Announcement",
      "date": "2024-01-15",
      "description": "Brief description...",
      "authors": [...]
    },
    // ... more articles
  ],
  "lastUpdated": "2024-01-15T10:30:00Z",
  "version": 1
}
```

### Index Management

#### 1. Initialization (for existing articles)
- The `/api/articles/search` endpoint checks if `blogs/index.json` exists
- If not, triggers initialization:
  1. List all objects with prefix `blogs/`
  2. Extract unique slugs
  3. Fetch each `article.json` file
  4. Build the index with all article metadata
  5. Save as `blogs/index.json`

#### 2. Update on new articles
- When the blog catch-all route fetches a new article:
  1. After saving `article.json`, call the internal function
  2. `updateArticleIndex()` function (not an HTTP endpoint):
     - Fetches current index (or creates if missing)
     - Adds/updates the article entry
     - Saves updated index back to R2
  3. This ensures index stays in sync

### API Endpoints

#### `GET /api/articles/search`
- Returns the complete index for client-side filtering
- Handles initialization if index doesn't exist
- Response: `{ articles: [...], lastUpdated: "..." }`

### Internal Functions (not exposed as endpoints)

#### `updateArticleIndex()` in `src/lib/index-manager.ts`
- Direct function call (not HTTP endpoint) for security
- Called internally by the blog route after processing new articles
- Parameters: `(env, articleData: { slug, title, date, description, authors })`
- Implementation:
  ```typescript
  export async function updateArticleIndex(env, articleData) {
    // Fetch current index from R2 or create new one
    const indexObj = await env.BLOG_STORAGE.get('blogs/index.json');
    const index = indexObj ? JSON.parse(await indexObj.text()) : { articles: [], version: 1 };
    
    // Add/update article entry
    const existingIndex = index.articles.findIndex(a => a.slug === articleData.slug);
    if (existingIndex >= 0) {
      index.articles[existingIndex] = articleData;
    } else {
      index.articles.push(articleData);
    }
    
    // Update metadata
    index.lastUpdated = new Date().toISOString();
    
    // Save back to R2
    await env.BLOG_STORAGE.put('blogs/index.json', JSON.stringify(index));
  }
  ```

### Frontend Implementation

#### Search Component on Homepage
1. Fetch all articles on mount from `/api/articles/search`
2. Store in React state
3. On search (Enter key):
   - Filter articles client-side (case-insensitive)
   - Separate into two arrays:
     - "Starts with": `title.toLowerCase().startsWith(query.toLowerCase())`
     - "Contains": `title.toLowerCase().includes(query.toLowerCase()) && !startsWithMatch`
4. Display both sections with clickable cards linking to `/blog/{slug}`

### Benefits of this approach
- Single network request for all article data
- Fast client-side filtering
- Index automatically maintained
- Works with existing R2 structure
- Handles both new and existing articles gracefully
