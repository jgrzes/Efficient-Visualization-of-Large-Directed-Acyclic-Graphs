import React from 'react';
import ControlButton from './ControlButton';

interface ControlsProps {
  pauseButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const Controls: React.FC<ControlsProps> = ({ pauseButtonRef }) => {
  return (
    <div id="controls" style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
      <ControlButton id="load" label="Wczytaj dane" />
      <ControlButton ref={pauseButtonRef} id="pause" label="Start / Pause" />
      <ControlButton id="fit-view" label="Dopasuj widok" />
      <ControlButton id="reset" label="Resetuj widok" />
      <ControlButton id="zoom" label="Przybliż punkt" />
      <ControlButton id="export" label="Eksportuj" />
    </div>
  );
};

export default Controls;
