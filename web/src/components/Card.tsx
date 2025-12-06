import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  title: string
  children: ReactNode
  style?: CSSProperties
}

export const Card = ({ title, children, style }: CardProps) => {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '2rem',
      ...style
    }}>
      <h2 style={{
        margin: '0 0 1.5rem 0',
        fontSize: '1.5rem',
        color: '#333',
        borderBottom: '2px solid #007bff',
        paddingBottom: '0.5rem'
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
