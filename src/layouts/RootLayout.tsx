import {Outlet} from 'react-router-dom';
import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {setDocumentDirection} from '@/i18n'

export function RootLayout() {
    const {i18n} = useTranslation();
    useEffect(() => {
        setDocumentDirection(i18n.language === 'fa' ? 'fa' : 'en')
    }, [i18n.language]);
    return <>
        <div className="noise"/>
        <Outlet/></>
}
