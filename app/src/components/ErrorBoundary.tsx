import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForNewBuild } from '../safeStorage';

type Props = { resetKey: string; children: ReactNode };
type State = { error: unknown; key: string };

// Ловит ошибки рендера и загрузки ленивых страниц, чтобы вместо белого экрана
// показать понятный экран с кнопкой. Сбрасывается при смене адреса.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  // Новый адрес — новая попытка: сбрасываем ошибку до рендера.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.key ? null : { error: null, key: props.resetKey };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnceForNewBuild()) return;
    console.error('[vidik] ошибка страницы', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkLoadError(this.state.error);
    return (
      <section className="section container" role="alert">
        <div className="mono">{chunk ? 'Сайт обновился' : 'Сбой воспроизведения'}</div>
        <h1 className="display display--l" style={{ margin: '12px 0' }}>Плёнку заело</h1>
        <p className="lead">
          {chunk
            ? 'Пока страница была открыта, вышла новая версия сайта. Перезагрузите страницу.'
            : 'Эта страница не смогла загрузиться. Попробуйте перезагрузить её или вернуться на главную.'}
        </p>
        <div className="row" style={{ marginTop: 24 }}>
          <button className="btn btn--primary" type="button" onClick={() => window.location.reload()}>
            Перезагрузить
          </button>
          <a className="btn" href="/">На главную</a>
        </div>
      </section>
    );
  }
}
