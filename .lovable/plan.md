
# Video Upload System for Summit Training Platform

## Overview
This plan implements a complete video upload system that allows admins to upload training videos directly through the app, with proper storage, playback, and management capabilities.

## What You'll Get
- A dedicated "training-videos" storage bucket for video files
- An admin upload interface accessible from the Manager Dashboard
- Video player integration in lessons that plays your uploaded videos
- Progress tracking when users watch videos

---

## Implementation Steps

### Step 1: Create Storage Bucket
Create a secure storage bucket for training videos with proper access controls:
- Public read access (so videos can stream to all users)
- Authenticated upload access (only logged-in admins/managers can upload)
- Support for common video formats (MP4, MOV, WebM)

### Step 2: Build Admin Video Upload Page
Create a new page at `/app/admin/videos` with:
- Drag-and-drop file upload area
- Video title, description, and category fields
- Target role selection (Rookie, Manager, or All)
- Upload progress indicator
- List of existing videos with edit/delete options

### Step 3: Update Video Player Integration
Modify the lesson pages to:
- Display uploaded videos using a proper HTML5 video player
- Support both uploaded videos (from storage) and external URLs (YouTube/Vimeo)
- Track when users complete watching a video

### Step 4: Add Navigation Link
Add a "Manage Videos" link in the Manager Dashboard for easy access to the upload interface.

---

## Technical Details

### Database Changes
```text
No new tables needed - using existing training_videos table
Update video_url field to store either:
  - Storage URL: /training-videos/filename.mp4
  - External URL: https://youtube.com/...
```

### Storage Bucket Configuration
```text
Bucket: training-videos
Public: Yes (for streaming)
File size limit: 500MB
Allowed types: video/mp4, video/quicktime, video/webm
```

### RLS Policies for Storage
```text
SELECT (read): Allow all authenticated users
INSERT (upload): Allow admins and managers only
DELETE: Allow admins only
```

### New Files
```text
src/pages/app/AdminVideos.tsx     - Video management page
src/components/VideoPlayer.tsx    - Reusable video player component
src/components/VideoUploader.tsx  - Upload component with progress
```

### Modified Files
```text
src/App.tsx                       - Add route for /app/admin/videos
src/pages/app/LessonPage.tsx      - Integrate VideoPlayer component
src/pages/app/ManagerDashboardPage.tsx - Add navigation link
```

---

## File Size Considerations

Video files can be large. Here's what to expect:

| Video Length | Approximate Size |
|--------------|------------------|
| 1 minute     | 10-50 MB         |
| 5 minutes    | 50-250 MB        |
| 10 minutes   | 100-500 MB       |

The storage bucket will have a 500MB per-file limit. For longer videos, you may want to:
- Compress videos before uploading
- Split into multiple parts
- Use YouTube/Vimeo for very long content

---

## User Flow

```text
Manager/Admin Flow:
1. Login as Manager/Admin
2. Navigate to Dashboard -> Manage Videos
3. Click "Upload Video"
4. Fill in title, description, category
5. Drag-and-drop or select video file
6. Wait for upload (progress bar shown)
7. Video appears in list and is available in training

Trainee Flow:
1. Navigate to training lesson
2. Video player loads automatically
3. Watch video
4. Click "Mark as Watched" (tracked for progress)
```
