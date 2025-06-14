declare global {
  interface String {
    formatted(): string
    getAppStoreStatusEmoji(): string
    getPlayStoreStatusEmoji(): string
  }
}

String.prototype.formatted = function (): string {
  return this.replace(/_/g, ' ').replace(
    /(^\w|\s\w)(\S*)/g,
    (_: string, m1: string, m2: string) => m1.toUpperCase() + m2.toLowerCase(),
  )
}

String.prototype.getAppStoreStatusEmoji = function (): string {
  const status = this.toLowerCase()

  switch (status) {
    case 'ready_for_sale':
    case 'ready for sale':
      return '🎉'
    case 'in_review':
    case 'in review':
    case 'waiting_for_review':
    case 'waiting for review':
      return '🚀'
    case 'processing':
      return '⚙️'
    case 'pending_developer_release':
    case 'pending developer release':
      return '⏳'
    case 'rejected':
    case 'invalid_binary':
    case 'invalid binary':
    case 'metadata_rejected':
    case 'metadata rejected':
    case 'developer_rejected':
    case 'developer rejected':
      return '❌'
    case 'draft':
    case 'prepare_for_submission':
    case 'prepare for submission':
      return '📝'
    default:
      return '📱'
  }
}

String.prototype.getPlayStoreStatusEmoji = function (): string {
  const status = this.toLowerCase()

  switch (status) {
    case 'completed':
      return '🎉'
    case 'in_progress':
    case 'inprogress':
      return '🚀'
    case 'draft':
      return '📝'
    case 'halted':
      return '⏸️'
    case 'rolled_back':
    case 'rolledback':
      return '🔄'
    case 'status_unspecified':
    case 'statusunspecified':
      return '❓'
    default:
      return '📱'
  }
}

export {}
