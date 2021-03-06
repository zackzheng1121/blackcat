if [ "$1" == "test" ]
then
  for file in commands/*.js ; do 
    node --check "$file"
    if ! node --check "$file"
    then
      echo "Check failed on $file"
      exit 1
    fi
  done
  node --check index.js
  node --check util/Util.js
  node --check include/player.js
elif [ "$1" == "release" ]
then
  echo "您已成功部署黑貓!"
elif [ "$1" == "build" ]
then
  npm i -g pm2
elif ["$1" == "setup" ]
then
  wget -O nodejs.deb https://deb.nodesource.com/node_16.x/pool/main/n/nodejs/nodejs_16.6.1-deb-1nodesource1_amd64.deb
  sudo apt install ./nodejs.deb
else
  pm2-runtime --secret "$PM2_SECRET" --public "$PM2_PUBLIC" --machine-name "Black cat Server" --deep-monitoring start process.json
fi
