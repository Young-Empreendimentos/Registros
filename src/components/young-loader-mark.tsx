import { YoungYIcon } from '@/components/young-y-icon';

/** Marca animada central — igual loading Pós-Venda */
export function YoungLoaderMark() {
  return (
    <div className="young-loader__content">
      <div className="young-loader__frame">
        <YoungYIcon className="young-loader__logo" animated />
      </div>
    </div>
  );
}
