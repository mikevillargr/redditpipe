/**
 * Utility function to copy text to clipboard with fallback support
 * Handles both modern Clipboard API and legacy execCommand
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern Clipboard API first
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.warn('Clipboard API failed, trying fallback:', err)
    
    // Fallback for older browsers or non-HTTPS contexts
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        return true
      } else {
        console.error('execCommand copy failed')
        return false
      }
    } catch (fallbackErr) {
      console.error('Fallback copy failed:', fallbackErr)
      return false
    }
  }
}
