// @ts-ignore Import module
import JSZip from 'https://esm.sh/jszip'

interface Icon {
    alt: string;
    src: string;
}

interface PerkListPromise {
    [ key: string ]: Promise<Blob>
};

interface PerkList {
    [ key: string ]: Blob
};

interface IconList {
    badges: PerkList;
    emojis: PerkList;
}

async function checkDOM( selector: string, n = 0 ): Promise<NodeListOf<Element>> {
    let result;

    if ( document.querySelectorAll( selector ).length > n ) {
        result = document.querySelectorAll( selector )
    }
    else {
        await sleep();
        result = checkDOM( selector );
    }

    return result
}

function sleep( s = 500 ): Promise<void> {
    return new Promise( res => setTimeout( res, s ) );
}

async function specifyPerks(): Promise<HTMLImageElement[]> {
    let [ action ] : HTMLElement[] = await checkDOM( "#sponsor-button button[aria-label*=Join], #contents button[aria-label*=perks]" ) as unknown as HTMLElement[];
    action.click()
    await sleep();
    let perks = [ ...await checkDOM( "ytd-sponsorships-perk-renderer img", 4 ) as unknown as HTMLImageElement[] ];
    for ( let node of perks ) {
        node.scrollIntoView();
        await sleep( 10 );
    }

    return perks
}

async function fetchPerks( perks: Icon[], namer: Function ): Promise<PerkList> {
    let fetches: PerkListPromise = perks.reduce( ( result, node, index ) => ( { ...result, [ namer( node, index ) ]: fetch( node.src ).then( res => res.blob() ) } ), {} );
    let list: PerkList = {}
    for ( let [ key, value ] of Object.entries( fetches ) ) {
        list[ key ] = await value
    }

    return list
}

async function getPerks( perk: HTMLImageElement[] ): Promise<IconList> {
    let perks:Icon[] = perk.map( node => ( { alt: node.alt, src: node.src.replace( /=(w\d+.+?|s\d+.+?)-k-nd/, '=s4096-k-nd' ) } ) );
    let [ badges, emojis ] = await Promise.all( [ fetchPerks( perks.filter( node => ( node.alt.includes( "badge" ) || node.alt == "" ) ), ( node: Icon, index: number ): string => index.toString().padStart( 2, "0" ) ), fetchPerks( perks.filter( node => ( !node.alt.includes( "badge" ) && node.alt != "" ) ), ( node: Icon, index: number ): string => node.alt ) ] )

    return { badges, emojis }
}

function addFiles2Folder( arch: JSZip, folder: string, list: PerkList ) {
    for ( let [ key, blob ] of Object.entries( list ) ) {
        arch = arch.file( `${ folder }/${ key }.${ blob.type.replace( /.+?\/(.+?)/, "$1" ) }`, blob )
    }
    return arch
}

async function makeArchive( { badges, emojis }:IconList ) {
    let zip = new JSZip();
    zip = addFiles2Folder( zip, "badges", badges )
    zip = addFiles2Folder( zip, "emojis", emojis )

    return zip.generateAsync( { type: "blob" } );
}

specifyPerks()
    .then( getPerks )
    .then( makeArchive )
    .then( URL.createObjectURL )
    .then( url => {
        let atVideo = document.querySelector( "#owner #upload-info ytd-channel-name #text-container #text" ) as HTMLDivElement;
        let atChannel = document.querySelector( "#channel-container #meta #container #text-container #text" ) as HTMLDivElement;
        let failSafe = document.title.replace( /^\(\d+\)\s(.+?)\s- YouTube$/, "$1" )
        let Channel =
            (
                atVideo?.offsetHeight
                    ?
                    atVideo.textContent
                    : (
                        atChannel?.offsetHeight
                            ?
                            atChannel.textContent
                            :
                            failSafe
                    )
            );

        let link = document.createElement( "a" );
        link.href = url;
        link.download = `${ Channel }.zip`
        link.click();
        console.log( `Downloading ${ Channel }.zip` )
    } )
