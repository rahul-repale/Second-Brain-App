interface cardProps{
  title: string,
  description: string,
  timestamp: string,
  tags: string[],
  author: string
}

export default function Card(props: cardProps){
  const { title, description, timestamp, tags, author } = props;

  return <div style={{
    fontFamily: 'monospace',
    border: 'grey',
    borderRadius: '5px',
    backgroundColor: 'lavender',
    color: 'blueviolet',
    minHeight: '25%',
    minWidth: '25%',
    maxWidth: '30%',
    padding: '20px',
    fontSize: '10px'
  }}>
    <div style={{
      fontWeight: 'bolder',
      fontSize: '20px'
    }}>{title}</div><br />
    <div>{description}</div><br />
    <div style={{
      display: 'flex',
      justifyContent: 'space-between'
    }}>
      <div>{tags}</div>
      <div>
        <div style={{
          marginBottom: '5px'
        }}>{timestamp}</div>
        <div>{author}</div>
      </div>
    </div>
  </div>
}