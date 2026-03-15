import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  title: string
  children: ReactNode
  style?: CSSProperties
}

export const Card = ({ title, children, style }: CardProps) => (
  <div style={{
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    padding: '1.5rem',
    ...style,
  }}>
    <h2 style={{
      margin: '0 0 1.25rem 0',
      fontSize: '1rem',
      fontWeight: 600,
      color: '#111',
      letterSpacing: '-0.01em',
    }}>
      {title}
    </h2>
    {children}
  </div>
)
