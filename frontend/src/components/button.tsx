import type { ReactElement } from "react";

type buttonVarient = 'Primary' | 'Secondary';
type buttonShape = 'Rectangle' | 'Circle';

interface buttonProps {
  varient: buttonVarient;
  shape: buttonShape;
  text: string;
  icon?: ReactElement;
}

const buttonStyles = new Map<buttonVarient | buttonShape, Record<string, string>>();

buttonStyles.set('Primary', { 
  'backgroundColor': 'blueviolet', 
  'color': 'lavender' 
});

buttonStyles.set('Secondary', { 
  'backgroundColor': 'lavender', 
  'color': 'blueviolet' 
});

buttonStyles.set('Rectangle', { 
  'borderRadius': '3px',
  'height': '30px',
  'width': '100px'
})

buttonStyles.set('Circle', {
  'width': '50px',
  'height': '50px',
  'borderRadius': '50%'
})

export function Button(props: buttonProps){
  const { text, shape, icon, varient } = props;

  return <div>
    <button style={{
      'margin': '5px',
      'fontSize': '12px',
      'fontFamily': 'monospace',
      'border': 'none',
      ...buttonStyles.get(shape), 
      ...buttonStyles.get(varient)
      }}>{icon? icon : null} {text}</button>
  </div>
}

