import * as React from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Check,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Separator } from '@/components/ui/Separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { cn } from '@/lib/utils'

export interface NotificationCenterProps {
  className?: string
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionUrl?: string
}

/**
 * NotificationCenter - Notification panel for viewing all notifications
 *
 * Features:
 * - View all notifications
 * - Mark as read/unread
 * - Clear notifications
 * - Different notification types
 * - Action buttons
 * - Unread badge count
 */
export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Extension installed',
      message: 'AI Copilot has been successfully installed and activated.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      actionLabel: 'Configure',
    },
    {
      id: '2',
      type: 'info',
      title: 'New update available',
      message: 'LIMN IDE v2.1.0 is now available. Click to download.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      actionLabel: 'Download',
      actionUrl: '#',
    },
    {
      id: '3',
      type: 'warning',
      title: 'Deprecated API usage',
      message: 'Found 3 instances of deprecated API. Update recommended.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
      actionLabel: 'View Details',
    },
    {
      id: '4',
      type: 'error',
      title: 'Build failed',
      message: 'TypeScript compilation failed with 5 errors.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: true,
      actionLabel: 'View Errors',
    },
    {
      id: '5',
      type: 'success',
      title: 'Git push successful',
      message: 'Successfully pushed 3 commits to origin/main.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={14} className="text-status-success" />
      case 'warning':
        return <AlertTriangle size={14} className="text-status-warning" />
      case 'error':
        return <AlertCircle size={14} className="text-status-error" />
      case 'info':
        return <Info size={14} className="text-warm-300" />
    }
  }

  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-status-success/20 bg-status-success/5'
      case 'warning':
        return 'border-status-warning/20 bg-status-warning/5'
      case 'error':
        return 'border-status-error/20 bg-status-error/5'
      case 'info':
        return 'border-warm-300/20 bg-warm-300/5'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('relative h-8 w-8 p-0', className)}>
          <Bell size={14} />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-2xs bg-status-error border border-bg-elevated text-white shadow-glow-error"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col max-h-[var(--limn-notification-panel-height)]">
          {/* Header */}
          <div className="p-3 border-b border-border-DEFAULT">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="h-5 px-1.5 text-2xs bg-warm-300/10 border border-warm-300/30 text-warm-300">
                    {unreadCount} new
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={markAllAsRead}
                  >
                    <Check size={10} className="mr-1" />
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-status-error hover:text-status-error"
                    onClick={clearAll}
                  >
                    <Trash2 size={10} className="mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={32} className="text-text-muted mb-2 opacity-30" />
                <p className="text-sm text-text-muted">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border-DEFAULT">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'group p-3 hover:bg-white/5 transition-colors',
                      !notification.read && 'bg-warm-300/5'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={cn(
                              'text-sm',
                              notification.read ? 'text-text-secondary' : 'text-text-primary font-medium'
                            )}
                          >
                            {notification.title}
                          </h4>
                          <span className="text-2xs text-text-muted whitespace-nowrap">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>

                        {notification.message && (
                          <p className="mt-1 text-xs text-text-muted line-clamp-2">
                            {notification.message}
                          </p>
                        )}

                        {notification.actionLabel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-6 px-2 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            {notification.actionLabel}
                            {notification.actionUrl && <ExternalLink size={10} className="ml-1" />}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeNotification(notification.id)}
                          title="Dismiss"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
