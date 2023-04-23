import * as React from "react";
import {Container} from "react-bootstrap";
import styles from "./DocBlock.module.css";
import Image from "next/Image";

interface Props {
    name: string;
    pageID: string;
}

export function DocBlock(props: Props){
    return(
        <>
        <a href={"/documents/" + props.pageID}>
        <Container className={styles.docBlock}>
            <Image src="/atmega.png" alt="atmega thumbnail image" height='200' width='130' 
                className={styles.thumbnail}/>
            <div className={styles.description}>{props.name}</div>
        </Container>
        </a>
        </>
    );
}