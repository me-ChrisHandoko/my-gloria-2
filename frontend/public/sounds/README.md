# Notification Sounds

This directory contains sound files for notifications.

## Required Files

### notification.mp3
- **Purpose**: Default notification sound for real-time updates
- **Format**: MP3
- **Duration**: Should be short (0.5-1 second)
- **Volume**: Normalized to moderate level
- **Example sources**:
  - https://freesound.org/
  - https://www.zapsplat.com/
  - https://mixkit.co/free-sound-effects/

## How to Add Sound Files

1. Download or create a notification sound
2. Convert to MP3 format if needed
3. Name the file `notification.mp3`
4. Place it in this directory (`/public/sounds/`)

## Recommended Sound Characteristics

- **Type**: Soft chime, bell, or subtle alert
- **Duration**: 0.5-1 second maximum
- **File size**: < 50KB
- **Bit rate**: 128 kbps
- **Sample rate**: 44.1 kHz

## Testing

To test the notification sound:
1. Open the application
2. Enable sound notifications in the notification bell settings
3. Trigger a test notification through the backend API

## Alternative Sounds

You can add additional sound files for different notification types:
- `success.mp3` - For successful operations
- `error.mp3` - For error notifications
- `warning.mp3` - For warning messages
- `urgent.mp3` - For high-priority notifications

To use alternative sounds, update the `NotificationBell` component to reference the appropriate file based on notification type.