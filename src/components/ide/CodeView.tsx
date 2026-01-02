import React from 'react'

export interface CodeViewProps {
  /** Active line number (0-indexed, optional) */
  activeLine?: number
  /** Show AI suggestion on active line */
  showAISuggestion?: boolean
  /** Custom className for the container */
  className?: string
}

/**
 * CodeView - A comprehensive code editor display component with syntax highlighting
 *
 * Features:
 * - 66 lines of TypeScript code with full syntax highlighting
 * - Active line highlighting with warm glow
 * - Line numbers with proper formatting
 * - Hover effects on each line
 * - AI suggestion ghost text on active line
 * - All LIMN syntax color tokens applied
 */
export function CodeView({ activeLine = 5, showAISuggestion = true, className }: CodeViewProps) {
  return (
    <div className={`h-full overflow-y-auto ${className || ''}`}>
      <div className="font-mono text-xs leading-relaxed">
        {/* Line 1 */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">1</span>
          <span className="text-text-secondary">
            <span style={{ color: 'var(--code-keyword)' }}>import</span> {'{'} User, UserRole {'}'}{' '}
            <span style={{ color: 'var(--code-keyword)' }}>from</span>{' '}
            <span style={{ color: 'var(--code-string)' }}>'@/types/user'</span>;
          </span>
        </div>

        {/* Line 2 */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">2</span>
          <span className="text-text-secondary">
            <span style={{ color: 'var(--code-keyword)' }}>import</span> {'{'} db {'}'}{' '}
            <span style={{ color: 'var(--code-keyword)' }}>from</span>{' '}
            <span style={{ color: 'var(--code-string)' }}>'@/lib/database'</span>;
          </span>
        </div>

        {/* Line 3 - Empty */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">3</span>
          <span />
        </div>

        {/* Line 4 - Comment */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">4</span>
          <span style={{ color: 'var(--code-comment)' }} className="italic">
            // User management service
          </span>
        </div>

        {/* Line 5 - Class declaration */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">5</span>
          <span className="text-text-secondary">
            <span style={{ color: 'var(--code-keyword)' }}>export</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>class</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>UserService</span>{' '}
            <span className="text-text-tertiary">{'{'}</span>
          </span>
        </div>

        {/* Line 6 - Active line with AI suggestion */}
        <div className={`flex gap-3 px-4 py-0.5 ${activeLine === 5 ? 'bg-warm-glow/10 border-l-2 border-warm-300' : 'hover:bg-white/5'}`}>
          <span className="w-10 text-right text-text-faint select-none">6</span>
          <span className="text-text-secondary pl-3">
            <span style={{ color: 'var(--code-keyword)' }}>async</span>{' '}
            <span className="code-function-highlight" style={{ color: 'var(--code-variable)' }}>createUser</span>
            <span className="text-text-tertiary">(</span>
            <span className="code-variable-highlight" style={{ color: 'var(--code-variable)' }}>data</span>
            <span className="text-text-tertiary">:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Partial</span>
            <span className="text-text-tertiary">{'<'}</span>
            <span style={{ color: 'var(--code-class)' }}>User</span>
            <span className="text-text-tertiary">{'>'}):</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Promise</span>
            <span className="text-text-tertiary">{'<'}</span>
            <span style={{ color: 'var(--code-class)' }}>User</span>
            <span className="text-text-tertiary">{'>'} {'{'}</span>
            {/* Ghost text suggestion */}
            {showAISuggestion && activeLine === 5 && (
              <span className="text-warm-300/40 italic ml-2">
                // Validate email format
              </span>
            )}
          </span>
        </div>

        {/* Line 7-8 */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">7</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>const</span>{' '}
            <span className="code-variable-highlight" style={{ color: 'var(--code-variable)' }}>user</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>await</span>{' '}
            <span className="code-variable-highlight" style={{ color: 'var(--code-variable)' }}>db</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span className="code-function-highlight" style={{ color: 'var(--code-variable)' }}>create</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' }'}</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">8</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>return</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>;</span>
          </span>
        </div>

        {/* Line 9-10 - Closing brace and empty */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">9</span>
          <span className="pl-3 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">10</span>
          <span />
        </div>

        {/* Line 11-15 - JSDoc comment */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">11</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {'/**'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">12</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' * Retrieves a user by their unique identifier'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">13</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' * @param id - The user ID'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">14</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' * @returns User object or null if not found'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">15</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' */'}
          </span>
        </div>

        {/* Line 16 - Method declaration */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">16</span>
          <span className="pl-3">
            <span style={{ color: 'var(--code-keyword)' }}>async</span>{' '}
            <span style={{ color: 'var(--code-function)' }}>getUser</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>string</span>
            <span style={{ color: 'var(--code-punctuation)' }}>):</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Promise</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'<'}</span>
            <span style={{ color: 'var(--code-class)' }}>User</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>|</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>null</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'>'}</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>

        {/* Line 17-19 */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">17</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>return</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>db</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>findUnique</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>where</span>
            <span style={{ color: 'var(--code-punctuation)' }}>: {'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' } }'}</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">18</span>
          <span className="pl-3 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">19</span>
          <span />
        </div>

        {/* Line 20 - Comment */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">20</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {'// Update user with validation'}
          </span>
        </div>

        {/* Line 21 - Method with more complex types */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">21</span>
          <span className="pl-3">
            <span style={{ color: 'var(--code-keyword)' }}>async</span>{' '}
            <span style={{ color: 'var(--code-function)' }}>updateUser</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>string</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Partial</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'<'}</span>
            <span style={{ color: 'var(--code-class)' }}>User</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'>'}</span>
            <span style={{ color: 'var(--code-punctuation)' }}>):</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Promise</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'<'}</span>
            <span style={{ color: 'var(--code-class)' }}>User</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'>'}</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>

        {/* Line 22-24 - Try-catch with validation */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">22</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>try</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">23</span>
          <span className="pl-9 italic" style={{ color: 'var(--code-comment)' }}>
            {'// Validate email format if provided'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">24</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-keyword)' }}>if</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>email</span>
            <span style={{ color: 'var(--code-punctuation)' }}>)</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>

        {/* Line 25-27 - Template literal and regex */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">25</span>
          <span style={{ paddingLeft: '48px' }}>
            <span style={{ color: 'var(--code-keyword)' }}>const</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>emailRegex</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-string)' }}>/^[^\s@]+@[^\s@]+\.[^\s@]+$/</span>
            <span style={{ color: 'var(--code-punctuation)' }}>;</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">26</span>
          <span style={{ paddingLeft: '48px' }}>
            <span style={{ color: 'var(--code-keyword)' }}>if</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>(!</span>
            <span style={{ color: 'var(--code-variable)' }}>emailRegex</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>test</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>email</span>
            <span style={{ color: 'var(--code-punctuation)' }}>))</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">27</span>
          <span style={{ paddingLeft: '60px' }}>
            <span style={{ color: 'var(--code-keyword)' }}>throw</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>new</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-string)' }}>`Invalid email format: </span>
            <span style={{ color: 'var(--code-variable)' }}>${'{'}data.email{'}'}</span>
            <span style={{ color: 'var(--code-string)' }}>`</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>

        {/* Line 28-32 - Closing braces and db call */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">28</span>
          <span style={{ paddingLeft: '48px' }} className="text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">29</span>
          <span className="pl-9 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">30</span>
          <span />
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">31</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-keyword)' }}>return</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>await</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>db</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>update</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>where</span>
            <span style={{ color: 'var(--code-punctuation)' }}>: {'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' }, '}</span>
            <span style={{ color: 'var(--code-property)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' }'}</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>

        {/* Line 32-35 - Catch block */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">32</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-punctuation)' }}>{'}'}</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>catch</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>)</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">33</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-variable)' }}>console</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-string)' }}>'Failed to update user:'</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">34</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-keyword)' }}>throw</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>;</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">35</span>
          <span className="pl-6 text-text-tertiary">{'}'}</span>
        </div>

        {/* Line 36-37 - Closing */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">36</span>
          <span className="pl-3 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">37</span>
          <span />
        </div>

        {/* Line 38-41 - Multi-line comment */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">38</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {'/*'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">39</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' * Delete user by ID'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">40</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' * Note: This performs a soft delete by setting deletedAt timestamp'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">41</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {' */'}
          </span>
        </div>

        {/* Line 42-50 - Delete method */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">42</span>
          <span className="pl-3">
            <span style={{ color: 'var(--code-keyword)' }}>async</span>{' '}
            <span style={{ color: 'var(--code-function)' }}>deleteUser</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>string</span>
            <span style={{ color: 'var(--code-punctuation)' }}>):</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Promise</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'<'}</span>
            <span style={{ color: 'var(--code-keyword)' }}>void</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'>'}</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">43</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>const</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>now</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>new</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Date</span>
            <span style={{ color: 'var(--code-punctuation)' }}>();</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">44</span>
          <span />
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">45</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>await</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>db</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>update</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">46</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-property)' }}>where</span>
            <span style={{ color: 'var(--code-punctuation)' }}>: {'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>id</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' },'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">47</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-property)' }}>data</span>
            <span style={{ color: 'var(--code-punctuation)' }}>: {'{ '}</span>
            <span style={{ color: 'var(--code-property)' }}>deletedAt</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>now</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>{' '}
            <span style={{ color: 'var(--code-property)' }}>status</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-string)' }}>'DELETED'</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{' },'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">48</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-punctuation)' }}>{'});'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">49</span>
          <span className="pl-3 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">50</span>
          <span className="text-text-tertiary">{'}'}</span>
        </div>

        {/* Line 51-55 - Method with numbers */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">51</span>
          <span />
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">52</span>
          <span className="pl-3 italic" style={{ color: 'var(--code-comment)' }}>
            {'// Get users with pagination'}
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">53</span>
          <span className="pl-3">
            <span style={{ color: 'var(--code-keyword)' }}>async</span>{' '}
            <span style={{ color: 'var(--code-function)' }}>getUsers</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>page</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>number</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-number)' }}>1</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>limit</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>number</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-number)' }}>20</span>
            <span style={{ color: 'var(--code-punctuation)' }}>)</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">54</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>const</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>offset</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>page</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>-</span>{' '}
            <span style={{ color: 'var(--code-number)' }}>1</span>
            <span style={{ color: 'var(--code-punctuation)' }}>)</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>*</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>limit</span>
            <span style={{ color: 'var(--code-punctuation)' }}>;</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">55</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>const</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>maxLimit</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>=</span>{' '}
            <span style={{ color: 'var(--code-number)' }}>100</span>
            <span style={{ color: 'var(--code-punctuation)' }}>;</span>
          </span>
        </div>

        {/* Line 56-60 - Validation */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">56</span>
          <span />
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">57</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>if</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-variable)' }}>limit</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'>'}</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>maxLimit</span>
            <span style={{ color: 'var(--code-punctuation)' }}>)</span>{' '}
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">58</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-keyword)' }}>throw</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>new</span>{' '}
            <span style={{ color: 'var(--code-class)' }}>Error</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-string)' }}>`Limit cannot exceed </span>
            <span style={{ color: 'var(--code-variable)' }}>${'{'}maxLimit{'}'}</span>
            <span style={{ color: 'var(--code-string)' }}>`</span>
            <span style={{ color: 'var(--code-punctuation)' }}>);</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">59</span>
          <span className="pl-6 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">60</span>
          <span />
        </div>

        {/* Line 61-66 - Query and return */}
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">61</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-keyword)' }}>return</span>{' '}
            <span style={{ color: 'var(--code-keyword)' }}>await</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>db</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-property)' }}>user</span>
            <span style={{ color: 'var(--code-punctuation)' }}>.</span>
            <span style={{ color: 'var(--code-function)' }}>findMany</span>
            <span style={{ color: 'var(--code-punctuation)' }}>(</span>
            <span style={{ color: 'var(--code-punctuation)' }}>{'{'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">62</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-property)' }}>take</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>limit</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">63</span>
          <span className="pl-9">
            <span style={{ color: 'var(--code-property)' }}>skip</span>
            <span style={{ color: 'var(--code-punctuation)' }}>:</span>{' '}
            <span style={{ color: 'var(--code-variable)' }}>offset</span>
            <span style={{ color: 'var(--code-punctuation)' }}>,</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">64</span>
          <span className="pl-6">
            <span style={{ color: 'var(--code-punctuation)' }}>{'});'}</span>
          </span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">65</span>
          <span className="pl-3 text-text-tertiary">{'}'}</span>
        </div>
        <div className="flex gap-3 px-4 py-0.5 hover:bg-white/5">
          <span className="w-10 text-right text-text-faint select-none">66</span>
          <span className="text-text-tertiary">{'}'}</span>
        </div>
      </div>
    </div>
  )
}
