import {Page} from './pattern.screen/Page';

export default function Home() {
    return (
        <Page breadcrumbs={[{title: 'Geometric Art', href: '/'}]}>
            <div>
                <a href="/export" className="link px-4 py-4 block hover:bg-base-100">
                    Exports
                </a>
            </div>
            <div>
                <a href="/gallery" className="link px-4 py-4 block hover:bg-base-100">
                    Gallery
                </a>
            </div>
            <div>
                <a href="/animator" className="link px-4 py-4 block hover:bg-base-100">
                    Animators
                </a>
            </div>
        </Page>
    );
}
