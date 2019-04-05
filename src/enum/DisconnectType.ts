export const enum DisconnectType
{
    Init,
    TimeOut, //Disconnect all instances also.
    AllInstances,
    CurrentInstance,
    NewSessionUnauthorized,
    UnknownConnection,
    DomainUnauthorized
}