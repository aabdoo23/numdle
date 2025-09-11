import React, { useState } from 'react';
import { MessageSquare, Send, X, Bug, MessageCircle, HelpCircle } from 'lucide-react';
import { gameApi } from '../services/api';

interface MessageSubmissionProps {
  username: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MessageSubmission: React.FC<MessageSubmissionProps> = ({ 
  username, 
  onClose, 
  onSuccess 
}) => {
  const [messageType, setMessageType] = useState<'bug_report' | 'feedback' | 'other'>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await gameApi.submitMessage(username, subject.trim(), message.trim(), messageType);
      setSuccess(true);
      onSuccess?.();
      
      // Close the modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageTypeOptions = [
    { value: 'bug_report', label: 'Bug Report', icon: Bug, description: 'Report a technical issue or bug' },
    { value: 'feedback', label: 'Feedback', icon: MessageCircle, description: 'Share your thoughts or suggestions' },
    { value: 'other', label: 'Other', icon: HelpCircle, description: 'General inquiries or other topics' }
  ] as const;

  if (success) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-2xl shadow-brand-lg p-8 w-full max-w-md text-center border border-neutral-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900 mb-2">Message Sent!</h3>
          <p className="text-secondary-600 mb-4">
            Thank you for your message. We'll review it and get back to you if needed.
          </p>
          <p className="text-sm text-secondary-500">
            This window will close automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-brand-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center space-x-2">
            <MessageSquare className="w-6 h-6" />
            <span>Send Message</span>
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Type Selection */}
          <div>
            <label className="block text-secondary-700 font-medium mb-3">
              Message Type
            </label>
            <div className="grid grid-cols-1 gap-3">
              {messageTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      messageType === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="messageType"
                      value={option.value}
                      checked={messageType === option.value}
                      onChange={(e) => setMessageType(e.target.value as typeof messageType)}
                      className="w-4 h-4 text-primary-500 border-neutral-300 focus:ring-primary-500 focus:ring-2"
                    />
                    <Icon className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-secondary-900">{option.label}</div>
                      <div className="text-sm text-secondary-600">{option.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-secondary-700 font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
              placeholder="Brief summary of your message"
              required
              maxLength={200}
            />
            <p className="text-sm text-secondary-500 mt-1">
              {subject.length}/200 characters
            </p>
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-secondary-700 font-medium mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-vertical"
              placeholder="Describe your issue, feedback, or question in detail..."
              required
              maxLength={2000}
            />
            <p className="text-sm text-secondary-500 mt-1">
              {message.length}/2000 characters
            </p>
          </div>

          {/* Username Display */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
            <p className="text-sm text-secondary-600">
              <strong>Submitting as:</strong> {username}
            </p>
            <p className="text-xs text-secondary-500 mt-1">
              This will help us identify and respond to your message.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <p className="text-warning-800 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="flex-1 bg-primary-900 hover:bg-primary-800 disabled:bg-neutral-400 text-white font-medium px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-brand"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-neutral-300 hover:bg-neutral-400 text-secondary-700 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
